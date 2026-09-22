/**
 * carregadorModelos.ts
 * ---------------------------------------------------------------------------
 * Camada de LEITURA dos modelos JSON mestres do servidor.
 *
 * Os modelos ficam em /modelos e contêm APENAS a estrutura dos exercícios e
 * os tipos de refeição. Eles são somente leitura: nenhuma rota escreve aqui.
 * A personalização acontece na cópia clonada para o SQLite do usuário.
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Modalidade, ModeloDieta, ModeloTreino, Objetivo } from '../tipos.js';

/** Caminho absoluto da pasta de modelos do servidor (apps/api/modelos). */
const CAMINHO_MODELOS = fileURLToPath(new URL('../../modelos', import.meta.url));

/** Lê e interpreta um arquivo JSON qualquer do disco. */
function lerJson<T>(caminhoArquivo: string): T {
  // readFileSync: leitura síncrona em milissegundos (arquivos locais pequenos).
  return JSON.parse(readFileSync(caminhoArquivo, 'utf-8')) as T;
}

/** Clona profundamente qualquer objeto via JSON (evita mutar o modelo mestre). */
function clonarProfundo<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

/** Lista as quantidades de dias disponíveis em uma pasta (ex.: [3, 4, 5]). */
function diasDisponiveisNaPasta(caminhoPasta: string): number[] {
  return readdirSync(caminhoPasta)
    .filter((arquivo) => /^\d+dias\.json$/.test(arquivo)) // só "3dias.json", "4dias.json"...
    .map((arquivo) => Number(arquivo.split('dias')[0])) // extrai o número de dias
    .sort((a, b) => a - b);
}

/** Ajusta o número de dias do modelo para a meta (corta ou completa repetindo). */
export function ajustarDiasDoModelo(modelo: ModeloTreino, diasAlvo: number): ModeloTreino {
  // Já está no tamanho certo: devolve o próprio modelo (clonado, por segurança).
  if (modelo.dias_da_semana.length === diasAlvo) {
    return clonarProfundo(modelo);
  }
  // Corta os dias excedentes quando o modelo tem mais dias que o necessário.
  const dias = modelo.dias_da_semana.slice(0, diasAlvo);
  let indice = 0;
  // Completa com dias repetidos (rotina cíclica, ex.: ABCABC) quando faltar.
  while (dias.length < diasAlvo) {
    dias.push(clonarProfundo(modelo.dias_da_semana[indice % modelo.dias_da_semana.length]));
    indice += 1;
  }
  return { ...modelo, dias: diasAlvo, dias_da_semana: dias };
}

/**
 * Localiza o modelo JSON mestre de treino cruzando os filtros do usuário:
 * modalidade (pasta) + objetivo (subpasta) + dias disponíveis (arquivo).
 * Se não existir arquivo exato, escolhe o mais próximo e ajusta os dias.
 */
export function buscarModeloTreino(modalidade: Modalidade, objetivo: Objetivo, dias: number): ModeloTreino {
  // Caminho da pasta: /modelos/treinos/academia/hipertrofia
  const caminhoPasta = `${CAMINHO_MODELOS}/treinos/${modalidade}/${objetivo}`;
  // Caminho do arquivo exato: /modelos/treinos/academia/hipertrofia/5dias.json
  const arquivoExato = `${caminhoPasta}/${dias}dias.json`;
  if (existsSync(arquivoExato)) {
    return lerJson<ModeloTreino>(arquivoExato);
  }
  // Fallback determinístico: lista os dias existentes na pasta.
  const disponiveis = diasDisponiveisNaPasta(caminhoPasta);
  if (disponiveis.length === 0) {
    throw new Error(`Nenhum modelo de treino encontrado em ${caminhoPasta}`);
  }
  // Prefere o menor modelo com dias >= ao pedido; senão usa o maior existente.
  const maioresOuIguais = disponiveis.filter((quantidade) => quantidade >= dias);
  const diasDoModelo = maioresOuIguais[0] ?? disponiveis[disponiveis.length - 1];
  const modelo = lerJson<ModeloTreino>(`${caminhoPasta}/${diasDoModelo}dias.json`);
  // Ajusta o modelo para a quantidade exata de dias do usuário.
  return ajustarDiasDoModelo(modelo, dias);
}

/** Localiza o modelo JSON mestre de dieta do objetivo informado. */
export function buscarModeloDieta(objetivo: Objetivo): ModeloDieta {
  // Caminho do arquivo: /modelos/dietas/emagrecimento.json
  const caminhoArquivo = `${CAMINHO_MODELOS}/dietas/${objetivo}.json`;
  if (!existsSync(caminhoArquivo)) {
    throw new Error(`Nenhum modelo de dieta encontrado para o objetivo ${objetivo}`);
  }
  return lerJson<ModeloDieta>(caminhoArquivo);
}

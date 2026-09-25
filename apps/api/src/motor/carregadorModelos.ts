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
import type { Modalidade, ModeloDieta, ModeloTreino, Objetivo, VariacaoDeTreino } from '../tipos.js';

/** Caminho absoluto da pasta de modelos do servidor (apps/api/modelos). */
const CAMINHO_MODELOS = fileURLToPath(new URL('../../modelos', import.meta.url));

/**
 * Reconhece os nomes oficiais dos modelos de treino:
 *   • "{dias}dias.json"        → estilo PADRÃO
 *   • "{dias}dias-{slug}.json" → estilo alternativo (variação nomeada)
 */
const PADRAO_DO_NOME = /^(\d+)dias(?:-([a-z0-9]+(?:-[a-z0-9]+)*))?\.json$/;

/** Lê e interpreta um arquivo JSON qualquer do disco. */
function lerJson<T>(caminhoArquivo: string): T {
  // readFileSync: leitura síncrona em milissegundos (arquivos locais pequenos).
  return JSON.parse(readFileSync(caminhoArquivo, 'utf-8')) as T;
}

/** Clona profundamente qualquer objeto via JSON (evita mutar o modelo mestre). */
function clonarProfundo<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

/**
 * Monta o nome do arquivo do modelo de treino.
 * Sem estilo (ou com "padrao") usa o clássico "{dias}dias.json"; com estilo
 * nomeado usa "{dias}dias-{slug}.json" (ex.: "3dias-forca-maxima.json").
 */
export function nomeDoArquivoDoTreino(dias: number, variacao?: string | null): string {
  // Normaliza o identificador recebido do perfil.
  const identificador = (variacao ?? '').trim();
  if (!identificador || identificador === 'padrao') {
    return `${dias}dias.json`;
  }
  return `${dias}dias-${identificador}.json`;
}

/** Lista as quantidades de dias disponíveis em uma pasta (ex.: [3, 4, 5]). */
function diasDisponiveisNaPasta(caminhoPasta: string): number[] {
  return readdirSync(caminhoPasta)
    .filter((arquivo) => /^\d+dias\.json$/.test(arquivo)) // só "3dias.json", "4dias.json"...
    .map((arquivo) => Number(arquivo.split('dias')[0])) // extrai o número de dias
    .sort((a, b) => a - b);
}

/**
 * Monta o rótulo curto de um estilo a partir do nome completo do modelo.
 * O nome segue o padrão "Rótulo - N Dias (detalhe)"; fica apenas o rótulo.
 */
function rotuloDaVariacao(nomeDoModelo: string, id: string): string {
  if (id === 'padrao') {
    return 'Padrão';
  }
  const primeiraParte = String(nomeDoModelo ?? '').split(/\s+[—-]\s+/)[0].trim();
  return primeiraParte || id;
}

/**
 * Lista TODOS os estilos de treino disponíveis no disco (padrão + variações),
 * varrendo modalidades e objetivos existentes em /modelos/treinos.
 * É a fonte do seletor de estilo do onboarding e da tela de perfil.
 */
export function listarVariacoesDeTreino(): VariacaoDeTreino[] {
  const raizDosTreinos = `${CAMINHO_MODELOS}/treinos`;
  if (!existsSync(raizDosTreinos)) {
    return [];
  }
  const variacoes: VariacaoDeTreino[] = [];
  // Percorre modalidades (academia, pesocorporal...).
  for (const modalidade of readdirSync(raizDosTreinos)) {
    const pastaDaModalidade = `${raizDosTreinos}/${modalidade}`;
    // Percorre objetivos (emagrecimento, hipertrofia, corrida).
    for (const objetivo of readdirSync(pastaDaModalidade)) {
      const pastaDoObjetivo = `${pastaDaModalidade}/${objetivo}`;
      // Percorre os arquivos JSON no padrão oficial de nomes.
      for (const arquivo of readdirSync(pastaDoObjetivo)) {
        const reconhecido = PADRAO_DO_NOME.exec(arquivo);
        if (!reconhecido) {
          continue;
        }
        const [, diasDoNome, slug] = reconhecido;
        // Lê o modelo para conferir a coerência com a pasta e pegar o nome.
        const modelo = lerJson<ModeloTreino>(`${pastaDoObjetivo}/${arquivo}`);
        if (
          modelo.modalidade !== modalidade ||
          modelo.objetivo !== objetivo ||
          modelo.dias !== Number(diasDoNome)
        ) {
          // Arquivo fora do lugar não entra no índice (o validador acusa antes).
          continue;
        }
        const id = slug ?? 'padrao';
        variacoes.push({
          id,
          nome: rotuloDaVariacao(modelo.nome, id),
          arquivo,
          dias: modelo.dias,
          modalidade: modelo.modalidade,
          objetivo: modelo.objetivo,
          duracao_estimada_min: modelo.duracao_estimada_min,
        });
      }
    }
  }
  return variacoes;
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
 * modalidade (pasta) + objetivo (subpasta) + dias + estilo (variação).
 * Se não existir arquivo exato, escolhe o mais próximo e ajusta os dias.
 */
export function buscarModeloTreino(
  modalidade: Modalidade,
  objetivo: Objetivo,
  dias: number,
  variacao: string | null = 'padrao',
): ModeloTreino {
  // Caminho da pasta: /modelos/treinos/academia/hipertrofia
  const caminhoPasta = `${CAMINHO_MODELOS}/treinos/${modalidade}/${objetivo}`;
  // Caminho do arquivo do estilo escolhido (ex.: 3dias-forca-maxima.json).
  const arquivoDoEstilo = `${caminhoPasta}/${nomeDoArquivoDoTreino(dias, variacao)}`;
  if (existsSync(arquivoDoEstilo)) {
    return lerJson<ModeloTreino>(arquivoDoEstilo);
  }
  // Estilo indisponível nesta quantidade de dias: cai no arquivo PADRÃO exato.
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

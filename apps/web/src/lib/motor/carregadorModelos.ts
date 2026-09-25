/**
 * carregadorModelos.ts (motor do navegador)
 * ---------------------------------------------------------------------------
 * Carrega os modelos JSON MESTRES como conteúdo ESTÁTICO (public/modelos),
 * permitindo que o sistema funcione sem servidor — exatamente o caso do
 * GitHub Pages. Mantém a mesma lógica de fallback determinístico do backend:
 * se não existir arquivo com a quantidade exata de dias, usa o mais próximo
 * e ajusta (corta ou repete dias em ciclo).
 * ---------------------------------------------------------------------------
 */
import type { ModeloDieta, ModeloTreino, IndiceDeModelos, VariacaoDeTreino } from './tipos-modelos';
import type { Modalidade, Objetivo } from '../tipos';

/**
 * Caminho base do site publicado. No GitHub Pages o projeto é servido em
 * /ProtocolFit, então os arquivos estáticos ficam sob esse prefixo.
 */
const CAMINHO_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Cache em memória dos modelos já baixados (evita requisições repetidas). */
const cacheDeModelos = new Map<string, unknown>();

/** Busca um arquivo JSON estático de /modelos com cache em memória. */
async function buscarJson<T>(caminhoRelativo: string): Promise<T | null> {
  // Reaproveita o resultado já carregado nesta sessão.
  const chave = caminhoRelativo;
  if (cacheDeModelos.has(chave)) {
    return cacheDeModelos.get(chave) as T;
  }
  // Busca o arquivo no site (conteúdo estático publicado).
  const resposta = await fetch(`${CAMINHO_BASE}/modelos/${caminhoRelativo}`);
  if (!resposta.ok) {
    return null;
  }
  const conteudo = (await resposta.json()) as T;
  // Guarda no cache para as próximas chamadas.
  cacheDeModelos.set(chave, conteudo);
  return conteudo;
}

/** Lê o índice de modelos disponíveis (gerado no build). */
let indiceEmCache: IndiceDeModelos | null = null;
async function lerIndice(): Promise<IndiceDeModelos | null> {
  if (indiceEmCache) {
    return indiceEmCache;
  }
  const indice = await buscarJson<IndiceDeModelos>('indice.json');
  indiceEmCache = indice;
  return indice;
}

/** Ajusta o número de dias do modelo para a meta (corta ou completa repetindo). */
export function ajustarDiasDoModelo(modelo: ModeloTreino, diasAlvo: number): ModeloTreino {
  // Clona para nunca mutar o modelo mestre carregado em cache.
  const clonado = JSON.parse(JSON.stringify(modelo)) as ModeloTreino;
  if (clonado.dias_da_semana.length === diasAlvo) {
    return clonado;
  }
  // Corta os dias excedentes quando o modelo tem mais dias que o necessário.
  const dias = clonado.dias_da_semana.slice(0, diasAlvo);
  let indice = 0;
  // Completa com dias repetidos (rotina cíclica, ex.: ABCABC).
  while (dias.length < diasAlvo) {
    dias.push(JSON.parse(JSON.stringify(clonado.dias_da_semana[indice % clonado.dias_da_semana.length])) as typeof dias[number]);
    indice += 1;
  }
  return { ...clonado, dias: diasAlvo, dias_da_semana: dias };
}

/**
 * Monta o nome do arquivo do modelo de treino.
 * Sem estilo (ou com "padrao") usa o clássico "{dias}dias.json"; com estilo
 * nomeado usa "{dias}dias-{slug}.json" (ex.: "3dias-forca-maxima.json").
 */
export function nomeDoArquivoDoTreino(dias: number, variacao?: string | null): string {
  // Normaliza o identificador recebido da interface/perfil.
  const identificador = (variacao ?? '').trim();
  if (!identificador || identificador === 'padrao') {
    return `${dias}dias.json`;
  }
  return `${dias}dias-${identificador}.json`;
}

/** Lista todos os estilos de treino disponíveis (índice gerado no build). */
export async function listarVariacoesDeTreino(): Promise<VariacaoDeTreino[]> {
  const indice = await lerIndice();
  return indice?.variacoes ?? [];
}

/** Filtra os estilos de uma combinação exata de modalidade + objetivo + dias. */
export async function variacoesDaCombinacao(
  modalidade: Modalidade,
  objetivo: Objetivo,
  dias: number,
): Promise<VariacaoDeTreino[]> {
  const todas = await listarVariacoesDeTreino();
  return todas.filter(
    (variacao) =>
      variacao.modalidade === modalidade && variacao.objetivo === objetivo && variacao.dias === dias,
  );
}

/**
 * Localiza o modelo de treino cruzando modalidade + objetivo + dias + estilo.
 * Usa o arquivo exato quando existe; caso contrário, aplica o fallback.
 */
export async function buscarModeloTreino(
  modalidade: Modalidade,
  objetivo: Objetivo,
  dias: number,
  variacao: string | null = 'padrao',
): Promise<{ modelo: ModeloTreino; caminhoDoModelo: string }> {
  const pasta = `treinos/${modalidade}/${objetivo}`;
  // 1) Tenta o arquivo EXATO do estilo escolhido
  //    (ex.: treinos/academia/hipertrofia/3dias-forca-maxima.json).
  const arquivoDoEstilo = nomeDoArquivoDoTreino(dias, variacao);
  const estiloExato = await buscarJson<ModeloTreino>(`${pasta}/${arquivoDoEstilo}`);
  if (estiloExato) {
    return { modelo: estiloExato, caminhoDoModelo: `${pasta}/${arquivoDoEstilo}` };
  }
  // 2) Estilo indisponível nesta quantidade de dias: cai no modelo PADRÃO exato.
  const arquivoPadrao = `${dias}dias.json`;
  const padraoExato = await buscarJson<ModeloTreino>(`${pasta}/${arquivoPadrao}`);
  if (padraoExato) {
    return { modelo: padraoExato, caminhoDoModelo: `${pasta}/${arquivoPadrao}` };
  }
  // 3) Fallback: consulta o índice e escolhe o modelo padrão mais próximo.
  const indice = await lerIndice();
  const disponiveis = indice?.treinos?.[modalidade]?.[objetivo] ?? [];
  if (disponiveis.length === 0) {
    throw new Error('Nenhum modelo de treino disponível para esta combinação.');
  }
  // Prefere o menor modelo com dias >= ao pedido; senão usa o maior existente.
  const maioresOuIguais = [...disponiveis].sort((a, b) => a - b).filter((quantidade) => quantidade >= dias);
  const diasDoModelo = maioresOuIguais[0] ?? Math.max(...disponiveis);
  const caminho = `${pasta}/${diasDoModelo}dias.json`;
  const modelo = await buscarJson<ModeloTreino>(caminho);
  if (!modelo) {
    throw new Error('Falha ao carregar o modelo de treino.');
  }
  // Ajusta o modelo para a quantidade exata de dias do usuário.
  return { modelo: ajustarDiasDoModelo(modelo, dias), caminhoDoModelo: caminho };
}

/** Localiza o modelo de dieta do objetivo informado. */
export async function buscarModeloDieta(
  objetivo: Objetivo,
): Promise<{ modelo: ModeloDieta; caminhoDoModelo: string }> {
  const caminho = `dietas/${objetivo}.json`;
  const modelo = await buscarJson<ModeloDieta>(caminho);
  if (!modelo) {
    throw new Error(`Nenhum modelo de dieta disponível para o objetivo ${objetivo}.`);
  }
  return { modelo, caminhoDoModelo: caminho };
}

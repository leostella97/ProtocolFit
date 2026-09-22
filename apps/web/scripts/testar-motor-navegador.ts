/**
 * testar-motor-navegador.ts
 * ---------------------------------------------------------------------------
 * Valida que o MOTOR DO NAVEGADOR (usado no site publicado no GitHub Pages)
 * produz EXATAMENTE os mesmos números do motor do servidor.
 *
 * Como funciona: os modelos JSON são lidos do disco (simulando o `fetch` que
 * o navegador faria em /modelos) e o cálculo é executado com o mesmo perfil
 * de teste já verificado na API:
 *   masculino, 27-31 anos, 178 cm, 82,5 kg, hipertrofia, 5 dias, academia
 *   → esperado: 3412 kcal, P 149 g, C 448 g, G 114 g, água 2888 ml,
 *     carga inicial 42,5 kg no supino e 175 g de ovos no café da manhã.
 *
 * Uso: npx tsx scripts/testar-motor-navegador.ts
 * ---------------------------------------------------------------------------
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Perfil } from '../src/lib/tipos';
import { calcularPlanoNutricional } from '../src/lib/motor/calculos';
import { buscarModeloDieta, buscarModeloTreino } from '../src/lib/motor/carregadorModelos';
import { montarPlanoDieta, montarPlanoTreino } from '../src/lib/motor/montadorPlano';

/** Pasta dos modelos mestres (a mesma que é publicada como conteúdo estático). */
const PASTA_MODELOS = join(process.cwd(), '..', 'api', 'modelos');

/** Simula o `fetch` do navegador lendo os modelos direto do disco. */
globalThis.fetch = (async (entrada: string | URL) => {
  // O caminho chega como "/modelos/treinos/academia/hipertrofia/5dias.json".
  const caminho = String(entrada).replace(/^.*\/modelos\//, '');
  try {
    const conteudo = await readFile(join(PASTA_MODELOS, caminho.replace('indice.json', '../indice.json')), 'utf-8');
    return { ok: true, json: async () => JSON.parse(conteudo) } as Response;
  } catch {
    // Arquivo inexistente: o carregador usa o fallback do índice.
    return { ok: false, json: async () => null } as unknown as Response;
  }
}) as typeof fetch;

/** Perfil de teste idêntico ao usado nos testes da API. */
const perfilDeTeste: Perfil = {
  id: 1,
  usuario_id: 1,
  sexo: 'masculino',
  faixa_etaria: '27-31',
  peso_kg: 82.5,
  altura_cm: 178,
  objetivo: 'hipertrofia',
  frequencia_semanal: 5,
  dias_disponiveis: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
  modalidade: 'academia',
  nivel: 'iniciante',
};

/** Lista de verificações executadas. */
const resultados: { descricao: string; esperado: string; obtido: string; ok: boolean }[] = [];

/** Compara um valor esperado com o obtido e registra o resultado. */
function conferir(descricao: string, esperado: unknown, obtido: unknown): void {
  const ok = String(esperado) === String(obtido);
  resultados.push({ descricao, esperado: String(esperado), obtido: String(obtido), ok });
}

/** Executa todas as verificações do motor do navegador. */
async function principal(): Promise<void> {
  // ---- 1) Plano nutricional (matemática determinística) --------------------
  const metas = calcularPlanoNutricional(perfilDeTeste);
  conferir('Meta calórica (kcal)', 3412, metas.meta_kcal);
  conferir('Proteínas (g)', 149, metas.proteinas_g);
  conferir('Carboidratos (g)', 448, metas.carboidratos_g);
  conferir('Gorduras (g)', 114, metas.gorduras_g);
  conferir('Água (ml)', 2888, metas.agua_ml);
  conferir('TMB (kcal)', 1798, metas.tmb);

  // ---- 2) Treino montado a partir do modelo mestre -------------------------
  const { modelo: modeloTreino, caminhoDoModelo } = await buscarModeloTreino('academia', 'hipertrofia', 5);
  conferir('Modelo de treino escolhido', 'treinos/academia/hipertrofia/5dias.json', caminhoDoModelo);
  const treino = montarPlanoTreino(modeloTreino, perfilDeTeste);
  conferir('Quantidade de dias do treino', 5, treino.dias);
  conferir('Exercício 1 do dia A', 'Supino reto com barra', treino.dias_da_semana[0].exercicios[0].nome);
  conferir('Carga sugerida do supino (kg)', 42.5, treino.dias_da_semana[0].exercicios[0].carga_sugerida_kg);
  conferir('Dicas de treino geradas', true, (treino.dicas ?? []).length >= 3);

  // ---- 3) Dieta montada com quantidades exatas em gramas ------------------
  const { modelo: modeloDieta } = await buscarModeloDieta('hipertrofia');
  const dieta = montarPlanoDieta(modeloDieta, perfilDeTeste, metas);
  conferir('Refeições montadas', 6, dieta.refeicoes.length);
  conferir('Item 1 do café da manhã', 'Ovos inteiros', dieta.refeicoes[0].itens[0].nome);
  conferir('Porção de ovos (g)', 175, dieta.refeicoes[0].itens[0].quantidade);
  conferir('Dicas de dieta geradas', true, (dieta.dicas ?? []).length >= 3);

  // ---- 4) Fallback determinístico (dias sem arquivo exato) ----------------
  const { modelo: modelo5Dias, caminhoDoModelo: caminhoFallback } = await buscarModeloTreino('pesocorporal', 'emagrecimento', 5);
  conferir('Fallback ajusta a quantidade de dias', 5, modelo5Dias.dias_da_semana.length);

  // ---- Relatório final ----------------------------------------------------
  for (const resultado of resultados) {
    const marca = resultado.ok ? 'OK    ' : 'FALHA ';
    console.log(`${marca} ${resultado.descricao}: esperado=${resultado.esperado} obtido=${resultado.obtido}`);
  }
  const falhas = resultados.filter((resultado) => !resultado.ok).length;
  console.log('');
  console.log(`=== MOTOR DO NAVEGADOR: ${resultados.length} verificacoes | ${falhas} falha(s) ===`);
  console.log(`Modelo usado: ${caminhoDoModelo} | fallback testado: ${caminhoFallback}`);
  if (falhas > 0) {
    console.error('RESULTADO: o motor do navegador DIVERGE do motor do servidor.');
    process.exit(1);
  }
  console.log('RESULTADO: motor do navegador IDENTICO ao do servidor (mesmos numeros).');
}

// Executa as verificações.
void principal();

/**
 * validar-modelos.mjs
 * ---------------------------------------------------------------------------
 * Validador dos modelos JSON mestres de treino do ProtocolFit.
 * Confere em TODOS os arquivos de apps/api/modelos/treinos:
 *   1) JSON válido;
 *   2) campos obrigatórios do esquema (nome, modalidade, objetivo, dias...);
 *   3) "dias" coerente com a quantidade de dias em dias_da_semana;
 *   4) exercícios com campos válidos e percentual de carga dentro de 0..1;
 *   5) matriz completa: 2 modalidades x 3 objetivos x dias 2..7;
 *   6) variações nomeadas no padrão "{dias}dias-{slug}.json" com conteúdo
 *      coerente com a pasta (modalidade/objetivo) e com o nome (dias).
 * Uso: node scripts/validar-modelos.mjs
 * ---------------------------------------------------------------------------
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

// Caminho da pasta de treinos (resolvido a partir deste arquivo).
const PASTA_TREINOS = fileURLToPath(new URL('../apps/api/modelos/treinos', import.meta.url));

// Matriz completa esperada pelo site.
const MODALIDADES = ['academia', 'pesocorporal'];
const OBJETIVOS = ['emagrecimento', 'hipertrofia', 'corrida'];
const DIAS = [2, 3, 4, 5, 6, 7];

// Tipos de exercício permitidos pelo esquema.
const TIPOS_VALIDOS = ['composto', 'isolador', 'cardio', 'corporal'];

// Contadores do relatório final.
let totalArquivos = 0;
let totalErros = 0;

/** Registra um erro de validação com caminho amigável. */
function registrarErro(caminhoRelativo, mensagem) {
  totalErros += 1;
  console.error(`ERRO  ${caminhoRelativo}: ${mensagem}`);
}

/**
 * Valida um único arquivo de treino.
 * `contexto` traz a modalidade/objetivo da pasta e o número de dias do NOME do
 * arquivo — assim garantimos que o conteúdo nunca "minta" sobre o caminho.
 */
function validarArquivo(caminhoRelativo, contexto = {}) {
  totalArquivos += 1;
  const caminhoCompleto = join(PASTA_TREINOS, caminhoRelativo);

  // 1) JSON válido.
  let modelo;
  try {
    modelo = JSON.parse(readFileSync(caminhoCompleto, 'utf-8'));
  } catch (erro) {
    registrarErro(caminhoRelativo, `JSON invalido: ${erro.message}`);
    return;
  }

  // 1.1) Coerência entre o NOME do arquivo e o conteúdo (evita modelo "órfão").
  if (contexto.modalidade && modelo.modalidade !== contexto.modalidade) {
    registrarErro(caminhoRelativo, `modalidade "${modelo.modalidade}" nao bate com a pasta "${contexto.modalidade}"`);
  }
  if (contexto.objetivo && modelo.objetivo !== contexto.objetivo) {
    registrarErro(caminhoRelativo, `objetivo "${modelo.objetivo}" nao bate com a pasta "${contexto.objetivo}"`);
  }
  if (contexto.dias && modelo.dias !== contexto.dias) {
    registrarErro(caminhoRelativo, `"dias"=${modelo.dias} nao bate com o nome do arquivo (${contexto.dias} dias)`);
  }

  // 2) Campos obrigatórios.
  if (typeof modelo.nome !== 'string' || modelo.nome.length === 0) {
    registrarErro(caminhoRelativo, 'campo "nome" ausente ou vazio');
  }
  if (!MODALIDADES.includes(modelo.modalidade)) {
    registrarErro(caminhoRelativo, `modalidade invalida: ${modelo.modalidade}`);
  }
  if (!OBJETIVOS.includes(modelo.objetivo)) {
    registrarErro(caminhoRelativo, `objetivo invalido: ${modelo.objetivo}`);
  }
  if (typeof modelo.duracao_estimada_min !== 'number') {
    registrarErro(caminhoRelativo, 'duracao_estimada_min ausente');
  }
  if (!Array.isArray(modelo.dias_da_semana)) {
    registrarErro(caminhoRelativo, 'dias_da_semana ausente');
    return;
  }

  // 3) Quantidade de dias coerente.
  const quantidadeDeDias = modelo.dias_da_semana.length;
  if (modelo.dias !== quantidadeDeDias) {
    registrarErro(caminhoRelativo, `"dias"=${modelo.dias} mas dias_da_semana tem ${quantidadeDeDias} entradas`);
  }

  // 4) Cada dia e exercício.
  modelo.dias_da_semana.forEach((dia, indiceDia) => {
    if (typeof dia.titulo !== 'string' || !Array.isArray(dia.exercicios) || dia.exercicios.length === 0) {
      registrarErro(caminhoRelativo, `dia ${indiceDia + 1}: titulo ou exercicios invalidos`);
      return;
    }
    dia.exercicios.forEach((exercicio, indiceExercicio) => {
      const rotulo = `dia ${indiceDia + 1}, exercicio ${indiceExercicio + 1} (${exercicio.nome ?? 'sem nome'})`;
      if (typeof exercicio.nome !== 'string' || typeof exercicio.grupo !== 'string' || typeof exercicio.dicas !== 'string') {
        registrarErro(caminhoRelativo, `${rotulo}: nome/grupo/dicas ausentes`);
      }
      if (!TIPOS_VALIDOS.includes(exercicio.tipo)) {
        registrarErro(caminhoRelativo, `${rotulo}: tipo invalido "${exercicio.tipo}"`);
      }
      for (const campo of ['series', 'repeticoes_min', 'repeticoes_max']) {
        if (typeof exercicio[campo] !== 'number' || exercicio[campo] <= 0) {
          registrarErro(caminhoRelativo, `${rotulo}: campo "${campo}" invalido`);
        }
      }
      // Descanso: 0 é válido para exercícios de cardio (finishers contínuos).
      if (typeof exercicio.descanso_segundos !== 'number' || exercicio.descanso_segundos < 0) {
        registrarErro(caminhoRelativo, `${rotulo}: campo "descanso_segundos" invalido`);
      }
      if (exercicio.repeticoes_min > exercicio.repeticoes_max) {
        registrarErro(caminhoRelativo, `${rotulo}: repeticoes_min maior que repeticoes_max`);
      }
      // Carga: null ou fração entre 0 e 1.
      if (exercicio.percentual_carga_peso_corporal !== null && exercicio.percentual_carga_peso_corporal !== undefined) {
        if (typeof exercicio.percentual_carga_peso_corporal !== 'number' || exercicio.percentual_carga_peso_corporal < 0 || exercicio.percentual_carga_peso_corporal > 1) {
          registrarErro(caminhoRelativo, `${rotulo}: percentual_carga_peso_corporal fora de 0..1`);
        }
      }
    });
  });
}

// Percorre a árvore e valida todos os arquivos.
for (const modalidade of MODALIDADES) {
  for (const objetivo of OBJETIVOS) {
    const pasta = join(PASTA_TREINOS, modalidade, objetivo);
    if (!existsSync(pasta)) {
      registrarErro(`${modalidade}/${objetivo}`, 'pasta ausente');
      continue;
    }
    // Todos os arquivos da pasta: o PADRÃO é "{n}dias.json" e cada VARIAÇÃO
    // extra é "{n}dias-{slug}.json" (ex.: 3dias-forca-maxima.json).
    const todosOsArquivos = readdirSync(pasta).filter((nome) => nome.endsWith('.json'));
    // 5) Confere a matriz completa por pasta (apenas os arquivos padrão).
    const arquivosPadrao = todosOsArquivos.filter((nome) => /^\d+dias\.json$/.test(nome));
    const diasDaPasta = arquivosPadrao.map((nome) => Number(nome.split('dias')[0])).sort((a, b) => a - b);
    const esperados = DIAS.filter((d) => !diasDaPasta.includes(d));
    if (esperados.length > 0) {
      registrarErro(`${modalidade}/${objetivo}`, `faltam arquivos: ${esperados.map((d) => `${d}dias.json`).join(', ')}`);
    }
    // Valida o arquivo padrão de cada quantidade de dias.
    for (const arquivo of arquivosPadrao) {
      const diasDoNome = Number(arquivo.split('dias')[0]);
      validarArquivo(`${modalidade}/${objetivo}/${arquivo}`, { modalidade, objetivo, dias: diasDoNome });
    }
    // Valida (e conta) cada variação nomeada da pasta.
    for (const arquivo of todosOsArquivos) {
      if (arquivosPadrao.includes(arquivo)) {
        continue;
      }
      const reconhecido = /^(\d+)dias-([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/.exec(arquivo);
      if (!reconhecido) {
        registrarErro(
          `${modalidade}/${objetivo}/${arquivo}`,
          'nome fora do padrao: use "{dias}dias.json" ou "{dias}dias-{slug}.json"',
        );
        continue;
      }
      validarArquivo(`${modalidade}/${objetivo}/${arquivo}`, {
        modalidade,
        objetivo,
        dias: Number(reconhecido[1]),
      });
    }
  }
}

// Relatório final.
console.log('');
console.log(`=== VALIDACAO: ${totalArquivos} arquivos analisados | ${totalErros} erro(s) ===`);
if (totalErros === 0) {
  console.log('RESULTADO: MATRIZ COMPLETA E VALIDA.');
} else {
  console.error('RESULTADO: EXISTEM PROBLEMAS - revise os arquivos acima.');
  process.exit(1);
}

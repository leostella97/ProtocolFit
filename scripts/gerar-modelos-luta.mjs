/**
 * gerar-modelos-luta.mjs — TEAM_010
 * ---------------------------------------------------------------------------
 * Gera a matriz padrão do objetivo "luta":
 *   treinos/academia/luta/{2..7}dias.json
 *   treinos/pesocorporal/luta/{2..7}dias.json
 *
 * Por que um gerador? Os 12 arquivos compartilham os mesmos BLOCOS DE DIA
 * (força superior, força inferior, potência, condicionamento de rounds,
 * pegada/core, regenerativo) rearranjados por quantidade de dias — montar à
 * mão duplicaria texto e convidaria erro. Rodar de novo é determinístico.
 *
 *   Uso: node scripts/gerar-modelos-luta.mjs
 * ---------------------------------------------------------------------------
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

// Pasta raiz dos modelos de treino (a partir deste arquivo).
const PASTA_TREINOS = join(dirname(fileURLToPath(import.meta.url)), '../apps/api/modelos/treinos');

/** Atalho para a linha de exercício no formato dos modelos existentes. */
function ex(nome, grupo, tipo, series, repeticoes_min, repeticoes_max, descanso_segundos, percentual_carga_peso_corporal, dicas) {
  return { nome, grupo, tipo, series, repeticoes_min, repeticoes_max, descanso_segundos, percentual_carga_peso_corporal, dicas };
}

// ---------------------------------------------------------------------------
// BLOCOS DE DIA — ACADEMIA (força-potência + condicionamento específico)
// ---------------------------------------------------------------------------
const A_SUP_FORCA = {
  titulo: 'Força — Corpo Superior',
  exercicios: [
    ex('Supino reto com barra', 'peito', 'composto', 4, 6, 8, 120, 0.6, 'Explosão na subida, controle na descida — soco nasce de força aplicada rápido.'),
    ex('Remada curvada com barra', 'costas', 'composto', 4, 6, 8, 90, 0.5, 'Força de puxar é a base do clinch e das quedas — aperte as escápulas.'),
    ex('Desenvolvimento militar com barra', 'ombro', 'composto', 4, 6, 8, 90, 0.35, 'Ombros fortes empurram, bloqueiam e sustentam a guarda o round inteiro.'),
    ex('Barra fixa com lastro', 'costas', 'corporal', 3, 6, 8, 90, null, 'Sem lastro, use repetições lentas (3 s descendo) — a pegada agradece.'),
    ex('Farmer\'s Walk', 'corpointeiro', 'composto', 3, 30, 40, 60, 0.4, 'Caminhe 30–40 s com halteres pesados: pegada e pescoço de lutador.'),
    ex('Pallof press', 'core', 'isolador', 3, 10, 12, 45, 0.15, 'Anti-rotação puro — é o core que resiste quando tentam te girar.'),
  ],
};

const A_INF_FORCA = {
  titulo: 'Força — Corpo Inferior',
  exercicios: [
    ex('Agachamento livre', 'pernas', 'composto', 4, 6, 8, 120, 0.6, 'Base de queda e de soco é perna: desça firme e suba com intenção.'),
    ex('Levantamento terra romeno', 'posterior', 'composto', 4, 6, 8, 90, 0.5, 'Cadeia posterior forte sustenta sprawl, ponte e explosão de quadril.'),
    ex('Afundo com halteres', 'pernas', 'composto', 3, 8, 10, 60, 0.2, 'Trabalho unilateral corrige o desequilíbrio de base da guarda.'),
    ex('Elevação pélvica com barra', 'gluteos', 'composto', 3, 8, 12, 60, 0.3, 'Glúteos são o motor da finalização de quadril e da saída de baixo.'),
    ex('Panturrilha em pé', 'panturrilha', 'isolador', 3, 10, 15, 45, 0.4, 'Amplitude completa — base de pivô e deslocamento.'),
    ex('Prancha lateral', 'core', 'corporal', 3, 1, 1, 45, null, '40 segundos de cada lado, quadril alto — estabilidade lateral de clinch.'),
  ],
};

const A_POTENCIA = {
  titulo: 'Potência e Explosão',
  exercicios: [
    ex('Arranco em potência com barra (hang clean)', 'pernas', 'composto', 5, 3, 5, 120, 0.4, 'O mais explosivo do dia: quadril estica e a barra sobe sozinha.'),
    ex('Supino explosivo com halteres', 'peito', 'composto', 4, 4, 6, 90, 0.35, 'Empurre o mais rápido possível — velocidade máxima vence carga máxima aqui.'),
    ex('Salto em caixa', 'pliometria', 'corporal', 4, 5, 8, 90, null, 'Aterrissagem silenciosa e firme — potência sem destruir a canela.'),
    ex('Remada explosiva na máquina', 'costas', 'composto', 3, 8, 10, 60, 0.35, 'Puxe rápido e controle a volta — imita o tranco de uma puxada de kimono.'),
    ex('Rotação russa com anilha', 'core', 'isolador', 3, 10, 14, 45, 0.1, 'Gire o tronco, não só os braços — rotação é a mecânica do soco cruzado.'),
  ],
};

const A_CONDICIONAMENTO = {
  titulo: 'Condicionamento de Rounds (HIIT)',
  exercicios: [
    // Grupo cardio: várias séries = tiros de X–Y segundos com descanso entre eles.
    ex('Corda naval (battle rope)', 'cardio', 'cardio', 6, 30, 30, 60, null, '6 tiros de 30 s com tudo que tiver — alternância igual à de um round.'),
    ex('Saco de pancada — tiros de velocidade', 'cardio', 'cardio', 5, 60, 60, 45, null, '5 tiros de 1 min sem tirar o pé: mão alta, base móvel, ritmo vivo.'),
    ex('Thruster com halteres', 'corpointeiro', 'composto', 4, 10, 12, 60, 0.25, 'Agachamento + desenvolvimento num movimento só — força sob fadiga.'),
    ex('Burpee com salto', 'corpointeiro', 'corporal', 3, 10, 15, 45, null, 'Sprawl disfarçado: peito no chão e explosão na volta.'),
    ex('Prancha com toque no ombro', 'core', 'corporal', 3, 16, 20, 45, null, 'Quadril parado enquanto a mão sobe — é assim que se absorve pressão.'),
  ],
};

const A_CIRCUITO_RESISTENTE = {
  titulo: 'Força Resistente — Circuito (3–4 voltas)',
  exercicios: [
    ex('Agachamento goblet', 'pernas', 'composto', 3, 12, 15, 45, 0.2, 'Ritmo contínuo sem travar — força que aguenta o terceiro round.'),
    ex('Flexão de braço', 'peito', 'corporal', 3, 12, 20, 45, null, 'Peito ao chão e volta inteira — resistência de empurrar cansado.'),
    ex('Remada invertida ou na máquina', 'costas', 'composto', 3, 12, 15, 45, 0.3, 'Puxe com as costas, não com os braços — resistência de clinch.'),
    ex('Afundo alternado', 'pernas', 'corporal', 3, 12, 16, 45, null, 'Passo atrás ou andando — pernas que não apagam no fim da luta.'),
    ex('Abdominal bicicleta', 'core', 'corporal', 3, 16, 20, 30, null, 'Rotação contínua de tronco — transição de guarda exige isso.'),
  ],
};

const A_PEGADA_CORE = {
  titulo: 'Pegada, Trapézio e Core',
  exercicios: [
    ex('Farmer\'s Walk', 'corpointeiro', 'composto', 4, 30, 45, 60, 0.45, 'A pegada cansa antes do braço — segurar peso andando é seguir o kimono.'),
    ex('Isometria na barra (dead hang)', 'corpointeiro', 'corporal', 3, 20, 40, 60, null, 'Pendure 20–40 s: antebraço e ombros que não soltam a lapela.'),
    ex('Encolhimento com halteres', 'trapezio', 'isolador', 3, 10, 12, 45, 0.3, 'Trapézio forte amortece impacto e protege o pescoço na queda.'),
    ex('Pallof press', 'core', 'isolador', 3, 10, 12, 45, 0.15, 'Resista à rotação do cabo — força de ficar de pé quando te empurram.'),
    ex('Abdominal supra com carga', 'core', 'isolador', 3, 10, 15, 45, 0.1, 'Flexione as costelas ao quadril com peso leve — sem jogar o pescoço.'),
  ],
};

const A_REGENERATIVO = {
  titulo: 'Regenerativo — Mobilidade e Core Leve',
  exercicios: [
    ex('Corrida leve regenerativa', 'cardio', 'cardio', 1, 15, 20, 0, null, '15–20 minutos em ritmo de conversa — solta as pernas, não é treino de gás.'),
    ex('Alongamento dinâmico de quadril', 'mobilidade', 'corporal', 2, 10, 12, 30, null, 'Balanços e círculos de quadril — mobilidade é amplitude com controle.'),
    ex('Prancha isométrica', 'core', 'corporal', 3, 1, 1, 45, null, '30–40 segundos estáveis — leve, para lembrar o corpo de estabilizar.'),
    ex('Respiração diafragmática', 'respiracao', 'corporal', 3, 8, 10, 30, null, 'Inspire enchendo a barriga — controlar a respiração é controlar o round.'),
  ],
};

// ---------------------------------------------------------------------------
// BLOCOS DE DIA — PESO CORPORAL (mesma lógica, sem equipamento de academia)
// ---------------------------------------------------------------------------
const P_SUP_FORCA = {
  titulo: 'Força — Corpo Superior',
  exercicios: [
    ex('Flexão de braço', 'peito', 'corporal', 4, 8, 15, 90, null, 'Desça o peito ao chão e suba completo — força de empurrar é defesa de queda.'),
    ex('Flexão diamante', 'triceps', 'corporal', 3, 8, 12, 60, null, 'Mãos juntas sob o peito — tríceps para o jab e para postar no chão.'),
    ex('Barra fixa', 'costas', 'corporal', 4, 5, 8, 90, null, 'Puxar o peso do corpo é a pegada funcional — sem barra, use remada invertida.'),
    ex('Pike push-up', 'ombro', 'corporal', 3, 8, 12, 60, null, 'Quadril alto, cabeça entre as mãos — ombros fortes para a guarda.'),
    ex('Isometria na barra (dead hang)', 'corpointeiro', 'corporal', 3, 20, 40, 60, null, 'Pendure até a pegada falhar — antebraço de quem segura kimono.'),
    ex('Prancha lateral', 'core', 'corporal', 3, 1, 1, 45, null, '30–40 segundos de cada lado — estabilidade de clinch e base.'),
  ],
};

const P_INF_FORCA = {
  titulo: 'Força — Corpo Inferior',
  exercicios: [
    ex('Agachamento livre', 'pernas', 'corporal', 4, 15, 20, 60, null, 'Profundo e controlado — as pernas são o chão de toda projeção.'),
    ex('Agachamento búlgaro', 'pernas', 'corporal', 3, 8, 12, 60, null, 'Pé de trás apoiado num banco/sofá — força unilateral de verdade.'),
    ex('Afundo alternado', 'pernas', 'corporal', 3, 12, 16, 60, null, 'Passo firme e joelho alinhado — resistência de pernas para os rounds.'),
    ex('Elevação pélvica', 'gluteos', 'corporal', 3, 12, 15, 45, null, 'Esprem o quadril no topo — o motor da ponte e da saída de baixo.'),
    ex('Panturrilha unipodal', 'panturrilha', 'corporal', 3, 12, 15, 45, null, 'Uma perna de cada vez, amplitude total — equilíbrio e pivô.'),
    ex('Prancha isométrica', 'core', 'corporal', 3, 1, 1, 45, null, '40–60 segundos — o core é a ponte entre soco e perna.'),
  ],
};

const P_POTENCIA = {
  titulo: 'Potência e Explosão',
  exercicios: [
    ex('Agachamento com salto explosivo', 'pliometria', 'corporal', 4, 6, 10, 90, null, 'Máxima altura, aterrissagem macia — explosão de quadril para quedas.'),
    ex('Flexão explosiva (com palma)', 'peito', 'corporal', 4, 5, 8, 90, null, 'Descole as mãos do chão se conseguir — potência de soco começa aqui.'),
    ex('Saltos alternados (bound)', 'pliometria', 'corporal', 3, 8, 12, 60, null, 'Passadas longas e elásticas — explosão horizontal de entrada.'),
    ex('Burpee com salto', 'corpointeiro', 'corporal', 4, 8, 12, 60, null, 'Sprawl + salto num movimento — explosão completa do lutador.'),
    ex('Rotação de tronco em pé', 'core', 'corporal', 3, 12, 16, 45, null, 'Gire rápido com os pés firmes — rotação é a mecânica do golpe.'),
  ],
};

const P_CONDICIONAMENTO = {
  titulo: 'Condicionamento de Rounds (HIIT)',
  exercicios: [
    ex('Sombra de luta — tiros', 'cardio', 'cardio', 6, 60, 60, 45, null, '6 tiros de 1 min golpeando no ar com ritmo e guarda alta.'),
    ex('Corrida em tiros', 'cardio', 'cardio', 8, 30, 30, 60, null, '8 tiros de 30 s rápidos com 60 s trotando — gás de round.'),
    ex('Mountain climbers', 'core', 'corporal', 4, 30, 40, 45, null, 'Joelhos ao peito sem parar — cardio disfarçado de abdominal.'),
    ex('Polichinelo', 'corpointeiro', 'corporal', 3, 30, 40, 30, null, 'Ritmo vivo e coordenação — pés ativos como na troca de base.'),
    ex('Bear crawl (caminhada de urso)', 'core', 'corporal', 3, 10, 15, 45, null, 'Quadril baixo e costas planas — escapa, entra e sai de posições.'),
  ],
};

const P_CIRCUITO_RESISTENTE = {
  titulo: 'Força Resistente — Circuito (3–4 voltas)',
  exercicios: [
    ex('Flexão de braço', 'peito', 'corporal', 3, 12, 20, 45, null, 'Volume cansado mas técnico — é empurrar no terceiro round.'),
    ex('Agachamento livre', 'pernas', 'corporal', 3, 15, 20, 45, null, 'Sem parar: pernas incandescentes ainda respondem.'),
    ex('Barra fixa ou remada invertida', 'costas', 'corporal', 3, 6, 10, 60, null, 'Puxar sob fadiga — a pegada quando já não sobra antebraço.'),
    ex('Afundo alternado', 'pernas', 'corporal', 3, 12, 16, 45, null, 'Alterne as pernas sem travar — resistência de base.'),
    ex('Abdominal bicicleta', 'core', 'corporal', 3, 16, 20, 30, null, 'Transição de guarda é rotação contínua — treine exatamente isso.'),
  ],
};

const P_PEGADA_CORE = {
  titulo: 'Pegada, Pescoço e Core',
  exercicios: [
    ex('Isometria na barra (dead hang)', 'corpointeiro', 'corporal', 4, 20, 40, 60, null, 'A pegada cansa antes do braço — pendure até quase soltar.'),
    ex('Prancha com toque no ombro', 'core', 'corporal', 3, 16, 20, 45, null, 'Quadril travado enquanto a mão sobe — resistir à rotação é defesa.'),
    ex('Superman lombar', 'lombar', 'corporal', 3, 12, 15, 45, null, 'Estique braços e pernas no ar — a cadeia posterior que te põe de pé.'),
    ex('Hollow hold', 'core', 'corporal', 3, 15, 25, 45, null, 'Lombar colada no chão, corpo em canoa — o brace de todo golpe.'),
    ex('Rotação russa', 'core', 'corporal', 3, 12, 16, 45, null, 'Gire o tronco com controle — a rotação do soco e da queda.'),
  ],
};

const P_REGENERATIVO = {
  titulo: 'Regenerativo — Mobilidade e Core Leve',
  exercicios: [
    ex('Caminhada ou trote leve', 'cardio', 'cardio', 1, 15, 20, 0, null, '15–20 minutos soltos — circula e recupera, não é treino de gás.'),
    ex('Alongamento dinâmico de quadril', 'mobilidade', 'corporal', 2, 10, 12, 30, null, 'Círculos e balanços de quadril — mobilidade com controle.'),
    ex('Prancha isométrica', 'core', 'corporal', 3, 1, 1, 45, null, '30–40 segundos estáveis — lembrança de estabilidade, não esforço.'),
    ex('Respiração diafragmática', 'respiracao', 'corporal', 3, 8, 10, 30, null, 'Respiração nasal e barriga cheia — recuperar é habilidade.'),
  ],
};

// ---------------------------------------------------------------------------
// COMBINAÇÕES POR QUANTIDADE DE DIAS
// ---------------------------------------------------------------------------
// A ordem importa: força primeiro nos dias de menos sessões; potência e
// condicionamento entram quando há espaço sem competir pelo mesmo dia.
const PLANOS = {
  academia: {
    2: [A_SUP_FORCA, A_CONDICIONAMENTO],
    3: [A_SUP_FORCA, A_INF_FORCA, A_POTENCIA],
    4: [A_SUP_FORCA, A_INF_FORCA, A_PEGADA_CORE, A_CONDICIONAMENTO],
    5: [A_SUP_FORCA, A_INF_FORCA, A_POTENCIA, A_PEGADA_CORE, A_CONDICIONAMENTO],
    6: [A_SUP_FORCA, A_INF_FORCA, A_POTENCIA, A_CIRCUITO_RESISTENTE, A_PEGADA_CORE, A_CONDICIONAMENTO],
    7: [A_SUP_FORCA, A_INF_FORCA, A_POTENCIA, A_CIRCUITO_RESISTENTE, A_PEGADA_CORE, A_CONDICIONAMENTO, A_REGENERATIVO],
  },
  pesocorporal: {
    2: [P_SUP_FORCA, P_CONDICIONAMENTO],
    3: [P_SUP_FORCA, P_INF_FORCA, P_POTENCIA],
    4: [P_SUP_FORCA, P_INF_FORCA, P_PEGADA_CORE, P_CONDICIONAMENTO],
    5: [P_SUP_FORCA, P_INF_FORCA, P_POTENCIA, P_PEGADA_CORE, P_CONDICIONAMENTO],
    6: [P_SUP_FORCA, P_INF_FORCA, P_POTENCIA, P_CIRCUITO_RESISTENTE, P_PEGADA_CORE, P_CONDICIONAMENTO],
    7: [P_SUP_FORCA, P_INF_FORCA, P_POTENCIA, P_CIRCUITO_RESISTENTE, P_PEGADA_CORE, P_CONDICIONAMENTO, P_REGENERATIVO],
  },
};

const NOMES = {
  academia: 'Luta — Força, Potência e Condicionamento',
  pesocorporal: 'Luta de Calistenia — Força, Potência e Condicionamento',
};

// Duração estimada sobe com a quantidade de blocos do dia mais longo.
const DURACAO = 60;

/**
 * Serializa o modelo no formato da casa: metadados indentados e UM exercício
 * por linha — como nos arquivos de treino existentes.
 */
// Ordem canônica dos campos de exercício — igual aos arquivos existentes.
const ORDEM_DOS_CAMPOS = ['nome', 'grupo', 'tipo', 'series', 'repeticoes_min', 'repeticoes_max', 'descanso_segundos', 'percentual_carga_peso_corporal', 'prescricao_fixa', 'distancia_km', 'dicas'];

/** Serializa um exercício numa linha: { "campo": valor, ... } — formato da casa. */
function linhaDoExercicio(e) {
  const partes = ORDEM_DOS_CAMPOS.filter((campo) => e[campo] !== undefined).map(
    (campo) => `${JSON.stringify(campo)}: ${JSON.stringify(e[campo])}`,
  );
  return `{ ${partes.join(', ')} }`;
}

function serializarModelo(modelo) {
  const diasSerializados = modelo.dias_da_semana
    .map((dia) => {
      const exercicios = dia.exercicios.map((e) => `        ${linhaDoExercicio(e)}`).join(',\n');
      return `    {\n      "titulo": ${JSON.stringify(dia.titulo)},\n      "exercicios": [\n${exercicios}\n      ]\n    }`;
    })
    .join(',\n');
  return (
    `{\n` +
    `  "nome": ${JSON.stringify(modelo.nome)},\n` +
    `  "modalidade": ${JSON.stringify(modelo.modalidade)},\n` +
    `  "objetivo": ${JSON.stringify(modelo.objetivo)},\n` +
    `  "dias": ${modelo.dias},\n` +
    `  "duracao_estimada_min": ${modelo.duracao_estimada_min},\n` +
    `  "dias_da_semana": [\n${diasSerializados}\n  ]\n` +
    `}\n`
  );
}

let gerados = 0;
for (const [modalidade, combinacoes] of Object.entries(PLANOS)) {
  const pasta = join(PASTA_TREINOS, modalidade, 'luta');
  mkdirSync(pasta, { recursive: true });
  for (const [dias, diasDaSemana] of Object.entries(combinacoes)) {
    const modelo = {
      nome: `${NOMES[modalidade]} (${dias} dias)`,
      modalidade,
      objetivo: 'luta',
      dias: Number(dias),
      duracao_estimada_min: DURACAO,
      dias_da_semana: diasDaSemana,
    };
    const caminho = join(pasta, `${dias}dias.json`);
    writeFileSync(caminho, serializarModelo(modelo), 'utf-8');
    console.log(`[luta] ${modalidade}/${dias}dias.json (${diasDaSemana.length} dias, ${diasDaSemana.reduce((s, d) => s + d.exercicios.length, 0)} exercícios)`);
    gerados += 1;
  }
}
console.log(`[luta] ${gerados} modelos gerados.`);

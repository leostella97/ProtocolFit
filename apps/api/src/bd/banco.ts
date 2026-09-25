/**
 * banco.ts
 * ---------------------------------------------------------------------------
 * Camada de acesso ao SQLite do ProtocolFit.
 *
 * Arquitetura de isolamento de dados:
 *  - Os modelos JSON em /modelos são MESTRES, imutáveis e protegidos (nunca
 *    recebem escrita do usuário).
 *  - Cada plano gerado é CLONADO para a tabela `planos` com o id do usuário.
 *  - O usuário lê e edita APENAS a própria cópia — os mestres ficam intactos.
 *
 * SQLite + modo WAL garante leituras e escritas na casa dos milissegundos,
 * sem servidor de banco externo e com custo de infraestrutura mínimo.
 * ---------------------------------------------------------------------------
 */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { CheckinDiario, Modalidade, Nivel, Objetivo, Perfil, RegistroEvolucao, Sexo, TipoPlano } from '../tipos.js';

/** Caminho absoluto da pasta de dados do servidor (apps/api/dados). */
const CAMINHO_DADOS = fileURLToPath(new URL('../../dados', import.meta.url));

/** Cria a pasta de dados caso ainda não exista (primeira execução). */
mkdirSync(CAMINHO_DADOS, { recursive: true });

/** Conexão única e síncrona com o arquivo do banco SQLite. */
export const banco = new Database(`${CAMINHO_DADOS}/protocolfit.db`);

/** WAL permite leituras concorrentes e escritas rápidas. */
banco.pragma('journal_mode = WAL');

/** Garante integridade referencial entre as tabelas. */
banco.pragma('foreign_keys = ON');

/** Linha da tabela `usuarios`. */
export interface LinhaUsuario {
  /** Identificador único. */
  id: number;
  /** Nome exibido. */
  nome: string;
  /** E-mail de acesso (único, case-insensitive). */
  email: string;
  /** Hash bcrypt da senha — a senha pura NUNCA é armazenada. */
  senha_hash: string;
  /** Contador de tentativas de login falhas consecutivas. */
  tentativas_falhas: number;
  /** Timestamp (ms) até o qual a conta fica bloqueada (null = desbloqueada). */
  bloqueado_ate: number | null;
  /** Data de criação da conta. */
  criado_em: string;
}

/** Linha da tabela `perfis`. */
interface LinhaPerfil {
  /** Identificador único. */
  id: number;
  /** Chave estrangeira do usuário. */
  usuario_id: number;
  /** Sexo biológico. */
  sexo: string;
  /** Faixa etária canônica. */
  faixa_etaria: string;
  /** Peso em kg. */
  peso_kg: number;
  /** Altura em cm. */
  altura_cm: number;
  /** Objetivo do plano. */
  objetivo: string;
  /** Frequência semanal de treino. */
  frequencia_semanal: number;
  /** JSON com a lista de dias disponíveis. */
  dias_disponiveis: string;
  /** Modalidade de treino. */
  modalidade: string;
  /** Nível de experiência. */
  nivel: string;
  /** Estilo de treino escolhido (null = estilo padrão). */
  variacao_treino: string | null;
  /** Data da última atualização. */
  atualizado_em: string;
}

/** Linha da tabela `planos` (cópias individuais por usuário). */
export interface LinhaPlano {
  /** Identificador único da cópia. */
  id: number;
  /** Dono da cópia. */
  usuario_id: number;
  /** Tipo do plano: 'treino' ou 'dieta'. */
  tipo: string;
  /** Versão do plano (incrementa a cada recálculo). */
  versao: number;
  /** 1 = plano vigente, 0 = plano substituído por um recálculo. */
  ativo: number;
  /** Caminho relativo do modelo JSON mestre que originou esta cópia. */
  modelo_origem: string;
  /** JSON completo do plano montado (a cópia individual do usuário). */
  conteudo: string;
  /** Data de criação da cópia. */
  criado_em: string;
}

/** Linha da tabela `registros_evolucao` (pesagens do usuário). */
interface LinhaEvolucao {
  /** Identificador único. */
  id: number;
  /** Chave estrangeira do usuário. */
  usuario_id: number;
  /** Data do registro (AAAA-MM-DD). */
  data: string;
  /** Peso registrado em kg. */
  peso_kg: number;
}

/** Cria todas as tabelas do sistema caso ainda não existam. */
function criarTabelas(): void {
  banco.exec(`
    -- Tabela de contas de usuário --------------------------------------------
    CREATE TABLE IF NOT EXISTS usuarios (
      id                INTEGER PRIMARY KEY AUTOINCREMENT, -- chave primária
      nome              TEXT    NOT NULL,                  -- nome exibido
      email             TEXT    NOT NULL UNIQUE COLLATE NOCASE, -- e-mail único
      senha_hash        TEXT    NOT NULL,                  -- hash bcrypt da senha
      tentativas_falhas INTEGER NOT NULL DEFAULT 0,        -- tentativas de login erradas
      bloqueado_ate     INTEGER,                           -- ms até liberar a conta
      criado_em         TEXT    NOT NULL DEFAULT (datetime('now')) -- data de criação
    );

    -- Tabela de perfil físico e nutricional do usuário ------------------------
    CREATE TABLE IF NOT EXISTS perfis (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT, -- chave primária
      usuario_id         INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE, -- 1 perfil por usuário
      sexo               TEXT    NOT NULL,                  -- masculino | feminino
      faixa_etaria       TEXT    NOT NULL,                  -- ex.: "19-23"
      peso_kg            REAL    NOT NULL,                  -- peso em kg (aceita decimal)
      altura_cm          REAL    NOT NULL,                  -- altura em cm
      objetivo           TEXT    NOT NULL,                  -- emagrecimento | hipertrofia | corrida
      frequencia_semanal INTEGER NOT NULL,                  -- sessões por semana
      dias_disponiveis   TEXT    NOT NULL,                  -- JSON: ["segunda","quarta"]
      modalidade         TEXT    NOT NULL,                  -- academia | pesocorporal
      nivel              TEXT    NOT NULL DEFAULT 'iniciante', -- nível de experiência
      variacao_treino    TEXT,                              -- estilo de treino (null = padrão)
      atualizado_em      TEXT    NOT NULL DEFAULT (datetime('now')) -- última atualização
    );

    -- Tabela de planos CLONADOS por usuário -----------------------------------
    CREATE TABLE IF NOT EXISTS planos (
      id             INTEGER PRIMARY KEY AUTOINCREMENT, -- chave primária da cópia
      usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, -- dono da cópia
      tipo           TEXT    NOT NULL CHECK (tipo IN ('treino', 'dieta')), -- tipo do plano
      versao         INTEGER NOT NULL DEFAULT 1,        -- versão (recálculos)
      ativo          INTEGER NOT NULL DEFAULT 1,        -- 1 = vigente, 0 = antigo
      modelo_origem  TEXT    NOT NULL,                  -- caminho do modelo JSON mestre
      conteudo       TEXT    NOT NULL,                  -- JSON do plano montado (cópia individual)
      criado_em      TEXT    NOT NULL DEFAULT (datetime('now')) -- data da clonagem
    );

    -- Índice para buscar o plano vigente de um usuário em milissegundos -------
    CREATE INDEX IF NOT EXISTS idx_planos_usuario ON planos (usuario_id, tipo, ativo);

    -- Tabela de evolução corporal (pesagens) ----------------------------------
    CREATE TABLE IF NOT EXISTS registros_evolucao (
      id         INTEGER PRIMARY KEY AUTOINCREMENT, -- chave primária
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, -- dono do registro
      data       TEXT    NOT NULL,                  -- data da pesagem (AAAA-MM-DD)
      peso_kg    REAL    NOT NULL,                  -- peso registrado em kg
      criado_em  TEXT    NOT NULL DEFAULT (datetime('now')) -- data de criação
    );

    -- Índice para listar a evolução em ordem cronológica rapidamente ----------
    CREATE INDEX IF NOT EXISTS idx_evolucao_usuario ON registros_evolucao (usuario_id, data);

    -- Tabela de CHECK-IN DIÁRIO -----------------------------------------------
    -- Um registro por usuário POR DIA (a chave única permite atualizar o
    -- mesmo dia em vez de duplicar).
    CREATE TABLE IF NOT EXISTS checkins (
      id             INTEGER PRIMARY KEY AUTOINCREMENT, -- chave primária
      usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, -- dono do check-in
      data           TEXT    NOT NULL,                  -- dia do check-in (AAAA-MM-DD)
      treino_feito   INTEGER NOT NULL DEFAULT 0,        -- 1 = treinou no dia
      dieta_seguida  INTEGER NOT NULL DEFAULT 0,        -- 1 = seguiu a dieta
      agua_ml        INTEGER NOT NULL DEFAULT 0,        -- água bebida no dia (ml)
      peso_kg        REAL,                              -- peso do dia (opcional)
      observacao     TEXT,                              -- anotação livre do usuário
      criado_em      TEXT    NOT NULL DEFAULT (datetime('now')), -- criação
      UNIQUE (usuario_id, data)                         -- um check-in por dia
    );

    -- Índice para montar a sequência (streak) rapidamente ---------------------
    CREATE INDEX IF NOT EXISTS idx_checkins_usuario ON checkins (usuario_id, data);
  `);
}

/**
 * Migrações leves para bancos criados por versões anteriores do sistema.
 * O SQLite não aceita "ADD COLUMN IF NOT EXISTS": por isso conferimos as
 * colunas existentes com PRAGMA table_info antes de alterar.
 */
function migrarTabelas(): void {
  // Colunas atuais da tabela de perfis.
  const colunas = banco.prepare('PRAGMA table_info(perfis)').all() as { name: string }[];
  // Bancos antigos não têm a coluna do estilo de treino.
  if (!colunas.some((coluna) => coluna.name === 'variacao_treino')) {
    banco.exec('ALTER TABLE perfis ADD COLUMN variacao_treino TEXT');
  }
}

/** Executa a criação do esquema assim que o módulo é importado. */
criarTabelas();
migrarTabelas();

/* ---------------------------------------------------------------------------
 * FUNÇÕES DE REPOSITÓRIO (todas as consultas SQL centralizadas aqui)
 * ------------------------------------------------------------------------- */

/** Busca um usuário pelo e-mail (case-insensitive). */
export function buscarUsuarioPorEmail(email: string): LinhaUsuario | undefined {
  return banco.prepare('SELECT * FROM usuarios WHERE email = ?').get(email) as LinhaUsuario | undefined;
}

/** Busca um usuário pelo id. */
export function buscarUsuarioPorId(id: number): LinhaUsuario | undefined {
  return banco.prepare('SELECT * FROM usuarios WHERE id = ?').get(id) as LinhaUsuario | undefined;
}

/** Insere um novo usuário e devolve o id criado. */
export function criarUsuario(nome: string, email: string, senhaHash: string): number {
  const resultado = banco
    .prepare('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)')
    .run(nome, email, senhaHash);
  return Number(resultado.lastInsertRowid);
}

/** Atualiza o contador de tentativas falhas (e o bloqueio, quando aplicável). */
export function registrarTentativaFalha(id: number, novasTentativas: number, bloqueadoAte: number | null): void {
  banco
    .prepare('UPDATE usuarios SET tentativas_falhas = ?, bloqueado_ate = ? WHERE id = ?')
    .run(novasTentativas, bloqueadoAte, id);
}

/** Zera as tentativas falhas e libera a conta após um login bem-sucedido. */
export function limparTentativasFalhas(id: number): void {
  banco.prepare('UPDATE usuarios SET tentativas_falhas = 0, bloqueado_ate = NULL WHERE id = ?').run(id);
}

/** Busca o perfil do usuário, convertendo a linha bruta para o tipo `Perfil`. */
export function buscarPerfilPorUsuario(usuarioId: number): Perfil | undefined {
  const linha = banco.prepare('SELECT * FROM perfis WHERE usuario_id = ?').get(usuarioId) as LinhaPerfil | undefined;
  if (!linha) {
    return undefined;
  }
  return {
    id: linha.id,
    usuario_id: linha.usuario_id,
    sexo: linha.sexo as Sexo,
    faixa_etaria: linha.faixa_etaria,
    peso_kg: linha.peso_kg,
    altura_cm: linha.altura_cm,
    objetivo: linha.objetivo as Objetivo,
    frequencia_semanal: linha.frequencia_semanal,
    dias_disponiveis: JSON.parse(linha.dias_disponiveis) as string[],
    modalidade: linha.modalidade as Modalidade,
    nivel: linha.nivel as Nivel,
    variacao_treino: linha.variacao_treino ?? null,
  };
}

/** Insere ou atualiza (upsert) o perfil do usuário e devolve o perfil salvo. */
export function salvarPerfil(
  usuarioId: number,
  dados: Omit<Perfil, 'id' | 'usuario_id'>,
): Perfil {
  banco
    .prepare(
      `INSERT INTO perfis (usuario_id, sexo, faixa_etaria, peso_kg, altura_cm, objetivo, frequencia_semanal, dias_disponiveis, modalidade, nivel, variacao_treino)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (usuario_id) DO UPDATE SET
         sexo = excluded.sexo,
         faixa_etaria = excluded.faixa_etaria,
         peso_kg = excluded.peso_kg,
         altura_cm = excluded.altura_cm,
         objetivo = excluded.objetivo,
         frequencia_semanal = excluded.frequencia_semanal,
         dias_disponiveis = excluded.dias_disponiveis,
         modalidade = excluded.modalidade,
         nivel = excluded.nivel,
         variacao_treino = excluded.variacao_treino,
         atualizado_em = datetime('now')`,
    )
    .run(
      usuarioId,
      dados.sexo,
      dados.faixa_etaria,
      dados.peso_kg,
      dados.altura_cm,
      dados.objetivo,
      dados.frequencia_semanal,
      JSON.stringify(dados.dias_disponiveis),
      dados.modalidade,
      dados.nivel,
      dados.variacao_treino ?? null,
    );
  return buscarPerfilPorUsuario(usuarioId) as Perfil;
}

/** Desativa todos os planos vigentes do usuário (preparação para nova versão). */
export function desativarPlanosDoUsuario(usuarioId: number): void {
  banco.prepare('UPDATE planos SET ativo = 0 WHERE usuario_id = ? AND ativo = 1').run(usuarioId);
}

/** Calcula a próxima versão de plano do usuário para um tipo. */
export function proximaVersaoDoPlano(usuarioId: number, tipo: TipoPlano): number {
  const linha = banco
    .prepare('SELECT COALESCE(MAX(versao), 0) AS maxima FROM planos WHERE usuario_id = ? AND tipo = ?')
    .get(usuarioId, tipo) as { maxima: number };
  return linha.maxima + 1;
}

/** Insere uma nova cópia de plano no SQLite e devolve o id criado. */
export function inserirPlano(
  usuarioId: number,
  tipo: TipoPlano,
  versao: number,
  modeloOrigem: string,
  conteudo: string,
): number {
  const resultado = banco
    .prepare('INSERT INTO planos (usuario_id, tipo, versao, ativo, modelo_origem, conteudo) VALUES (?, ?, ?, 1, ?, ?)')
    .run(usuarioId, tipo, versao, modeloOrigem, conteudo);
  return Number(resultado.lastInsertRowid);
}

/** Busca o plano vigente do usuário para um tipo (treino | dieta). */
export function buscarPlanoAtivo(usuarioId: number, tipo: TipoPlano): LinhaPlano | undefined {
  return banco
    .prepare('SELECT * FROM planos WHERE usuario_id = ? AND tipo = ? AND ativo = 1 ORDER BY id DESC LIMIT 1')
    .get(usuarioId, tipo) as LinhaPlano | undefined;
}

/** Busca um plano pelo id (usado nas edições do usuário). */
export function buscarPlanoPorId(planoId: number): LinhaPlano | undefined {
  return banco.prepare('SELECT * FROM planos WHERE id = ?').get(planoId) as LinhaPlano | undefined;
}

/** Sobrescreve o conteúdo JSON de um plano (edição feita pelo usuário). */
export function atualizarConteudoDoPlano(planoId: number, conteudo: string): void {
  banco.prepare('UPDATE planos SET conteudo = ? WHERE id = ?').run(conteudo, planoId);
}

/** Registra uma pesagem do usuário e devolve o id criado. */
export function registrarEvolucao(usuarioId: number, data: string, pesoKg: number): number {
  const resultado = banco
    .prepare('INSERT INTO registros_evolucao (usuario_id, data, peso_kg) VALUES (?, ?, ?)')
    .run(usuarioId, data, pesoKg);
  return Number(resultado.lastInsertRowid);
}

/** Lista as pesagens do usuário em ordem cronológica crescente. */
export function listarEvolucao(usuarioId: number): RegistroEvolucao[] {
  const linhas = banco
    .prepare('SELECT id, data, peso_kg FROM registros_evolucao WHERE usuario_id = ? ORDER BY data ASC, id ASC')
    .all(usuarioId) as LinhaEvolucao[];
  return linhas.map((linha) => ({ id: linha.id, data: linha.data, peso_kg: linha.peso_kg }));
}

/** Busca a pesagem mais recente do usuário (usada no recálculo do plano). */
export function buscarUltimaEvolucao(usuarioId: number): RegistroEvolucao | undefined {
  const linha = banco
    .prepare('SELECT id, data, peso_kg FROM registros_evolucao WHERE usuario_id = ? ORDER BY data DESC, id DESC LIMIT 1')
    .get(usuarioId) as LinhaEvolucao | undefined;
  return linha ? { id: linha.id, data: linha.data, peso_kg: linha.peso_kg } : undefined;
}

/**
 * Grava a pesagem de um dia mantendo APENAS UM registro por data
 * (se já existir pesagem no dia, ela é atualizada em vez de duplicada).
 */
export function salvarPesagemDoDia(usuarioId: number, data: string, pesoKg: number): void {
  // Procura uma pesagem já existente no mesmo dia.
  const existente = banco
    .prepare('SELECT id FROM registros_evolucao WHERE usuario_id = ? AND data = ? LIMIT 1')
    .get(usuarioId, data) as { id: number } | undefined;
  if (existente) {
    // Atualiza o valor do dia (evita pontos duplicados no gráfico).
    banco.prepare('UPDATE registros_evolucao SET peso_kg = ? WHERE id = ?').run(pesoKg, existente.id);
    return;
  }
  // Primeiro registro do dia: insere normalmente.
  registrarEvolucao(usuarioId, data, pesoKg);
}

/**
 * Atualiza partes do corpo do perfil (peso e/ou altura) SEM regenerar planos.
 * É o que permite ao usuário corrigir peso e altura direto no painel.
 */
export function atualizarCorpoDoPerfil(
  usuarioId: number,
  dados: { peso_kg?: number; altura_cm?: number },
): Perfil | undefined {
  // Atualiza apenas o que foi informado (edição parcial).
  if (dados.peso_kg !== undefined) {
    banco.prepare('UPDATE perfis SET peso_kg = ?, atualizado_em = datetime(\'now\') WHERE usuario_id = ?').run(dados.peso_kg, usuarioId);
  }
  if (dados.altura_cm !== undefined) {
    banco.prepare('UPDATE perfis SET altura_cm = ?, atualizado_em = datetime(\'now\') WHERE usuario_id = ?').run(dados.altura_cm, usuarioId);
  }
  return buscarPerfilPorUsuario(usuarioId);
}

/* ---------------------------------------------------------------------------
 * CHECK-IN DIÁRIO
 * ------------------------------------------------------------------------- */

/** Linha da tabela `checkins`. */
interface LinhaCheckin {
  /** Identificador único. */
  id: number;
  /** Dono do check-in. */
  usuario_id: number;
  /** Dia do check-in (AAAA-MM-DD). */
  data: string;
  /** 1 = treinou no dia. */
  treino_feito: number;
  /** 1 = seguiu a dieta. */
  dieta_seguida: number;
  /** Água bebida no dia (ml). */
  agua_ml: number;
  /** Peso do dia (opcional). */
  peso_kg: number | null;
  /** Anotação livre. */
  observacao: string | null;
}

/** Converte a linha do banco no formato público de check-in. */
function converterCheckin(linha: LinhaCheckin): CheckinDiario {
  return {
    id: linha.id,
    data: linha.data,
    treino_feito: linha.treino_feito === 1,
    dieta_seguida: linha.dieta_seguida === 1,
    agua_ml: linha.agua_ml,
    peso_kg: linha.peso_kg,
    observacao: linha.observacao,
  };
}

/**
 * Salva (ou atualiza) o check-in de um dia — um registro por data.
 * Devolve o check-in gravado.
 */
export function salvarCheckin(
  usuarioId: number,
  dados: {
    data: string;
    treino_feito: boolean;
    dieta_seguida: boolean;
    agua_ml: number;
    peso_kg: number | null;
    observacao: string | null;
  },
): CheckinDiario {
  // UPSERT garantido pela chave única (usuario_id, data).
  banco
    .prepare(
      `INSERT INTO checkins (usuario_id, data, treino_feito, dieta_seguida, agua_ml, peso_kg, observacao)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (usuario_id, data) DO UPDATE SET
         treino_feito = excluded.treino_feito,
         dieta_seguida = excluded.dieta_seguida,
         agua_ml = excluded.agua_ml,
         peso_kg = excluded.peso_kg,
         observacao = excluded.observacao`,
    )
    .run(
      usuarioId,
      dados.data,
      dados.treino_feito ? 1 : 0,
      dados.dieta_seguida ? 1 : 0,
      dados.agua_ml,
      dados.peso_kg,
      dados.observacao,
    );
  // Se o usuário informou o peso, ele também entra na evolução corporal.
  if (dados.peso_kg !== null) {
    salvarPesagemDoDia(usuarioId, dados.data, dados.peso_kg);
  }
  return buscarCheckinDoDia(usuarioId, dados.data) as CheckinDiario;
}

/** Busca o check-in de um dia específico (ou undefined). */
export function buscarCheckinDoDia(usuarioId: number, data: string): CheckinDiario | undefined {
  const linha = banco
    .prepare('SELECT * FROM checkins WHERE usuario_id = ? AND data = ?')
    .get(usuarioId, data) as LinhaCheckin | undefined;
  return linha ? converterCheckin(linha) : undefined;
}

/** Lista os check-ins do usuário (mais recentes primeiro). */
export function listarCheckins(usuarioId: number, limite = 60): CheckinDiario[] {
  const linhas = banco
    .prepare('SELECT * FROM checkins WHERE usuario_id = ? ORDER BY data DESC LIMIT ?')
    .all(usuarioId, limite) as LinhaCheckin[];
  return linhas.map(converterCheckin);
}

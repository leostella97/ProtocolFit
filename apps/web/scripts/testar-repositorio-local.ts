/**
 * testar-repositorio-local.ts
 * ---------------------------------------------------------------------------
 * Testa o FLUXO COMPLETO do sistema em MODO NAVEGADOR (o mesmo usado no site
 * publicado no GitHub Pages), sem navegador real:
 *
 *   1) Cadastro da conta (com hash da senha)
 *   2) Login e bloqueio após 3 tentativas erradas (HTTP 423 equivalente)
 *   3) Onboarding → geração do treino e da dieta clonados
 *   4) Edição de carga/séries de um exercício
 *   5) Substituição de um alimento com recálculo da porção
 *   6) Registro de pesagem
 *   7) Recálculo do plano pela evolução física (nova versão)
 *   8) Isolamento: outra conta não edita o plano alheio
 *
 * O `localStorage` e o `fetch` são simulados em memória/disco para que o
 * mesmo código que roda no navegador seja exercitado aqui.
 *
 * Uso: npx tsx scripts/testar-repositorio-local.ts
 * ---------------------------------------------------------------------------
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { webcrypto } from 'node:crypto';

/** Armazenamento em memória que imita o localStorage do navegador. */
class ArmazenamentoFalso {
  private dados = new Map<string, string>();
  getItem(chave: string): string | null {
    return this.dados.has(chave) ? (this.dados.get(chave) as string) : null;
  }
  setItem(chave: string, valor: string): void {
    this.dados.set(chave, valor);
  }
  removeItem(chave: string): void {
    this.dados.delete(chave);
  }
  clear(): void {
    this.dados.clear();
  }
}

// ---- Simulação do ambiente do navegador ------------------------------------
const armazenamento = new ArmazenamentoFalso();
(globalThis as unknown as { window: unknown }).window = { localStorage: armazenamento, crypto: webcrypto };
(globalThis as unknown as { localStorage: unknown }).localStorage = armazenamento;

/** Pasta dos modelos mestres (servidos como conteúdo estático no site). */
const PASTA_MODELOS = join(process.cwd(), '..', 'api', 'modelos');

/** Simula o fetch lendo os modelos JSON do disco. */
globalThis.fetch = (async (entrada: string | URL) => {
  const caminho = String(entrada).replace(/^.*\/modelos\//, '');
  try {
    const conteudo = await readFile(join(PASTA_MODELOS, caminho), 'utf-8');
    return { ok: true, json: async () => JSON.parse(conteudo) } as Response;
  } catch {
    return { ok: false, json: async () => null } as unknown as Response;
  }
}) as typeof fetch;

/** Resultados das verificações. */
const resultados: { descricao: string; esperado: string; obtido: string; ok: boolean }[] = [];

/** Compara valores e registra o resultado da verificação. */
function conferir(descricao: string, esperado: unknown, obtido: unknown): void {
  resultados.push({ descricao, esperado: String(esperado), obtido: String(obtido), ok: String(esperado) === String(obtido) });
}

/** Executa o fluxo completo do sistema no modo navegador. */
async function principal(): Promise<void> {
  // Importa o repositório APÓS simular o navegador (localStorage, crypto, fetch).
  const repositorio = await import('../src/lib/repositorio-local');

  // ---- 1) Cadastro ---------------------------------------------------------
  const cadastro = await repositorio.cadastrarLocal({ nome: 'Maria Teste', email: 'maria@teste.com', senha: 'senhaSegura123' });
  conferir('Cadastro devolve token local', true, cadastro.token.startsWith('local:'));
  conferir('Nome do usuário criado', 'Maria Teste', cadastro.usuario.nome);

  // Conta duplicada deve ser recusada (409).
  try {
    await repositorio.cadastrarLocal({ nome: 'Outra', email: 'maria@teste.com', senha: 'senhaSegura123' });
    conferir('E-mail duplicado recusado', '409', 'não recusou');
  } catch (erro) {
    conferir('E-mail duplicado recusado', 409, (erro as { status: number }).status);
  }

  // ---- 2) Onboarding + geração dos planos ---------------------------------
  const conta = await repositorio.buscarContaLocal();
  conferir('Antes do onboarding não possui planos', false, conta.possui_planos);

  const gerado = await repositorio.salvarPerfilEGerarPlanosLocal({
    sexo: 'masculino',
    faixa_etaria: '27-31',
    peso_kg: 82.5,
    altura_cm: 178,
    objetivo: 'hipertrofia',
    frequencia_semanal: 5,
    dias_disponiveis: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
    modalidade: 'academia',
  });
  conferir('Treino gerado com 5 dias', 5, gerado.treino.dias);
  conferir('Modelo mestre vinculado', 'treinos/academia/hipertrofia/5dias.json', gerado.treino.modelo_origem);
  conferir('Dieta vinculada ao objetivo', 'dietas/hipertrofia.json', gerado.dieta.modelo_origem);
  conferir('Meta calórica calculada', 3412, gerado.dieta.meta.meta_kcal);
  conferir('Porção de ovos calculada (g)', 175, gerado.dieta.refeicoes[0].itens[0].quantidade);
  conferir('Dicas de treino presentes', true, gerado.treino.dicas.length >= 3);

  // ---- 3) Plano atual -----------------------------------------------------
  const plano = await repositorio.buscarPlanoAtualLocal();
  conferir('Plano atual devolve o perfil', 82.5, plano.perfil.peso_kg);
  conferir('Versão inicial do treino', 1, plano.treino.versao);

  // ---- 4) Edição de exercício --------------------------------------------
  const treinoEditado = await repositorio.editarExercicioLocal(plano.treino.id, {
    dia_indice: 0,
    exercicio_indice: 0,
    carga_kg: 45,
    series: 5,
  });
  conferir('Carga editada (kg)', 45, treinoEditado.dias_da_semana[0].exercicios[0].carga_sugerida_kg);
  conferir('Séries editadas', 5, treinoEditado.dias_da_semana[0].exercicios[0].series);

  // ---- 5) Substituição de alimento ---------------------------------------
  const dietaEditada = await repositorio.substituirAlimentoLocal(plano.dieta.id, {
    refeicao_indice: 0,
    item_indice: 0,
    alternativa_nome: 'Claras de ovo',
  });
  conferir('Alimento substituído', 'Claras de ovo', dietaEditada.refeicoes[0].itens[0].nome);
  conferir('Porção recalculada (g)', 525, dietaEditada.refeicoes[0].itens[0].quantidade);

  // ---- 6) Pesagem ---------------------------------------------------------
  await repositorio.registrarPesagemLocal(80, '2026-09-01');
  const evolucao = await repositorio.listarEvolucaoLocal();
  conferir('Pesagem registrada', 1, evolucao.length);
  conferir('Peso da pesagem', 80, evolucao[0].peso_kg);

  // ---- 7) Recálculo pela evolução ----------------------------------------
  const recalculado = await repositorio.recalcularPlanosLocal();
  conferir('Recálculo usa o peso mais recente', 80, recalculado.perfil.peso_kg);
  conferir('Nova versão do treino', 2, recalculado.treino.versao);
  conferir('Nova meta calórica', 3364, recalculado.dieta.meta.meta_kcal);

  // ---- 8) Isolamento entre contas ----------------------------------------
  await repositorio.cadastrarLocal({ nome: 'Intruso Teste', email: 'intruso@teste.com', senha: 'senhaSegura123' });
  try {
    await repositorio.editarExercicioLocal(plano.treino.id, { dia_indice: 0, exercicio_indice: 0, carga_kg: 999 });
    conferir('Isolamento bloqueia edição de plano alheio', '403', 'não bloqueou');
  } catch (erro) {
    conferir('Isolamento bloqueia edição de plano alheio', 403, (erro as { status: number }).status);
  }

  // ---- 9) Login: senha correta, senhas erradas e bloqueio ----------------
  const login = await repositorio.entrarLocal({ email: 'maria@teste.com', senha: 'senhaSegura123' });
  conferir('Login com senha correta', 'Maria Teste', login.usuario.nome);

  // Três tentativas erradas devem bloquear a conta por 5 horas.
  const codigos: number[] = [];
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    try {
      await repositorio.entrarLocal({ email: 'maria@teste.com', senha: 'senhaErrada123' });
    } catch (erro) {
      codigos.push((erro as { status: number }).status);
    }
  }
  conferir('Bloqueio na 3ª tentativa (423)', '401,401,423', codigos.join(','));
  try {
    await repositorio.entrarLocal({ email: 'maria@teste.com', senha: 'senhaSegura123' });
    conferir('Conta bloqueada recusa senha correta', '423', 'não bloqueou');
  } catch (erro) {
    conferir('Conta bloqueada recusa senha correta', 423, (erro as { status: number }).status);
  }

  // ---- Relatório ---------------------------------------------------------
  for (const resultado of resultados) {
    const marca = resultado.ok ? 'OK    ' : 'FALHA ';
    console.log(`${marca} ${resultado.descricao}: esperado=${resultado.esperado} obtido=${resultado.obtido}`);
  }
  const falhas = resultados.filter((resultado) => !resultado.ok).length;
  console.log('');
  console.log(`=== MODO NAVEGADOR (fluxo completo): ${resultados.length} verificacoes | ${falhas} falha(s) ===`);
  if (falhas > 0) {
    console.error('RESULTADO: existem falhas no fluxo do modo navegador.');
    process.exit(1);
  }
  console.log('RESULTADO: o SISTEMA COMPLETO funciona no modo navegador (GitHub Pages).');
}

void principal();

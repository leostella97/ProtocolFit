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
 *   9) Portabilidade: exportar o backup e restaurá-lo num "novo dispositivo"
 *      (armazenamento zerado), mantendo planos, pesagens, check-ins, senha
 *      e o aceite do termo — sem duplicar a conta numa reimportação.
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
  // Utilitários do termo de uso (aceite do aviso de responsabilidade).
  const { registrarAceiteDoTermo, termoFoiAceito } = await import('../src/lib/termo-de-uso');

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

  // AVISO DE RESPONSABILIDADE: sem o aceite, a geração é BLOQUEADA (403).
  const perfilDeTeste = {
    sexo: 'masculino' as const,
    faixa_etaria: '27-31',
    peso_kg: 82.5,
    altura_cm: 178,
    objetivo: 'hipertrofia' as const,
    frequencia_semanal: 5,
    dias_disponiveis: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
    modalidade: 'academia' as const,
  };
  try {
    await repositorio.salvarPerfilEGerarPlanosLocal(perfilDeTeste);
    conferir('Geracao bloqueada sem aceite do termo', '403', 'não bloqueou');
  } catch (erro) {
    conferir('Geracao bloqueada sem aceite do termo', 403, (erro as { status: number }).status);
  }

  // Depois de ACEITAR o termo, a geração funciona normalmente.
  registrarAceiteDoTermo();
  conferir('Termo aceito fica registrado no navegador', true, termoFoiAceito());

  const gerado = await repositorio.salvarPerfilEGerarPlanosLocal(perfilDeTeste);
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

  // ---- 8) Alteração de peso e altura direto no painel (PATCH /perfil/corpo) --
  const corpoAtualizado = await repositorio.atualizarCorpoLocal({ altura_cm: 180, peso_kg: 79.5 });
  conferir('Altura alterada no painel (cm)', 180, corpoAtualizado.perfil.altura_cm);
  conferir('Peso alterado no painel (kg)', 79.5, corpoAtualizado.perfil.peso_kg);
  // O peso alterado entra na evolução do dia (um único ponto por data).
  const evolucaoApos = await repositorio.listarEvolucaoLocal();
  const hoje = new Date().toISOString().slice(0, 10);
  const pesagensDeHoje = evolucaoApos.filter((registro) => registro.data === hoje);
  conferir('Pesagem do dia sem duplicar', 1, pesagensDeHoje.length);

  // ---- 8.1) Estilo (variação) de treino: troca e volta ao clássico --------
  const comEstilo = await repositorio.atualizarEstiloDeTreinoLocal('crossfit');
  conferir('Estilo gravado no perfil', 'crossfit', comEstilo.perfil.variacao_treino);
  conferir('Treino do estilo CrossFit', 'CrossFit Style - 5 Dias (WOD + Força)', comEstilo.treino.nome);
  conferir(
    'Modelo do estilo vinculado',
    'treinos/academia/hipertrofia/5dias-crossfit.json',
    comEstilo.treino.modelo_origem,
  );
  // Voltar ao clássico limpa o estilo (null) e restaura o modelo padrão.
  const semEstilo = await repositorio.atualizarEstiloDeTreinoLocal(null);
  conferir('Volta ao estilo padrão', 'null', semEstilo.perfil.variacao_treino);
  conferir(
    'Treino clássico restaurado',
    'Hipertrofia Split Clássico — 5 dias (ABCDE)',
    semEstilo.treino.nome,
  );

  // ---- 9) CHECK-IN DIÁRIO: hoje, ontem e anteontem (sequência de 3 dias) ---
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const anteontem = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Check-in de hoje com treino, dieta, água e peso.
  const checkinHoje = await repositorio.salvarCheckinLocal({
    treino_feito: true,
    dieta_seguida: true,
    agua_ml: 2500,
    peso_kg: 79.5,
    observacao: 'Treino A concluído',
  });
  conferir('Check-in de hoje salvo', true, checkinHoje.checkin.treino_feito);
  conferir('Água do check-in (ml)', 2500, checkinHoje.checkin.agua_ml);
  conferir('Sequência com 1 dia', 1, checkinHoje.sequencia_atual);

  // Check-ins dos dois dias anteriores (mantêm a sequência viva).
  await repositorio.salvarCheckinLocal({ data: ontem, treino_feito: true, agua_ml: 2000 });
  const resumoFinal = await repositorio.salvarCheckinLocal({ data: anteontem, dieta_seguida: true, agua_ml: 1800 });
  conferir('Sequência de 3 dias seguidos', 3, resumoFinal.sequencia_atual);
  conferir('Recorde de sequência', 3, resumoFinal.sequencia_maxima);
  conferir('Total de check-ins', 3, resumoFinal.total);
  conferir('Dias cumpridos registrados', 3, resumoFinal.dias_cumpridos.length);

  // Atualizar o MESMO dia não deve duplicar o registro.
  const resumoAposAtualizar = await repositorio.salvarCheckinLocal({ agua_ml: 3000 });
  conferir('Atualização do mesmo dia não duplica', 3, resumoAposAtualizar.total);
  conferir('Água atualizada no mesmo dia', 3000, resumoAposAtualizar.hoje?.agua_ml);

  // Leitura do resumo (usada pelo painel ao abrir).
  const resumoLido = await repositorio.buscarCheckinsLocal();
  conferir('Resumo lido pelo painel', 3, resumoLido.total);

  // Dia sem treino e sem dieta não conta para a sequência.
  const diaVazio = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const resumoComDiaVazio = await repositorio.salvarCheckinLocal({ data: diaVazio, agua_ml: 500 });
  conferir('Dia sem treino/dieta não quebra a sequência atual', 3, resumoComDiaVazio.sequencia_atual);

  // ---- 10) Isolamento entre contas ---------------------------------------
  await repositorio.cadastrarLocal({ nome: 'Intruso Teste', email: 'intruso@teste.com', senha: 'senhaSegura123' });
  try {
    await repositorio.editarExercicioLocal(plano.treino.id, { dia_indice: 0, exercicio_indice: 0, carga_kg: 999 });
    conferir('Isolamento bloqueia edição de plano alheio', '403', 'não bloqueou');
  } catch (erro) {
    conferir('Isolamento bloqueia edição de plano alheio', 403, (erro as { status: number }).status);
  }
  // O check-in também é isolado por conta (o intruso começa do zero).
  const checkinDoIntruso = await repositorio.buscarCheckinsLocal();
  conferir('Check-in isolado por conta', 0, checkinDoIntruso.total);

  // ---- 11) Login: senha correta, senhas erradas e bloqueio --------------
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

  // ---- 12) PORTABILIDADE: exportar e importar o progresso ------------------
  // A sessão ativa ainda é a da Maria (o bloqueio vale só para NOVOS logins).
  const backup = await repositorio.exportarProgressoLocal();
  conferir('Nome do arquivo de backup', true, backup.nomeDoArquivo.startsWith('protocolfit-progresso-'));
  const pacote = JSON.parse(backup.conteudo) as {
    aplicativo?: string;
    conta?: { email?: string };
    planos?: { id?: number; usuario_id?: number }[];
    evolucao?: unknown[];
    checkins?: unknown[];
    aceite_do_termo?: { versao?: number } | null;
  };
  conferir('Envelope do backup', 'protocolfit', pacote.aplicativo);
  conferir('Backup carrega a conta', 'maria@teste.com', pacote.conta?.email);
  conferir('Backup carrega os 8 planos', 8, pacote.planos?.length);
  conferir('Backup carrega as pesagens', 2, pacote.evolucao?.length);
  conferir('Backup carrega os check-ins', 4, pacote.checkins?.length);
  conferir('Aceite do termo viaja no backup', 1, pacote.aceite_do_termo?.versao);
  conferir(
    'Backup não vaza ids internos',
    true,
    (pacote.planos ?? []).every((plano) => plano.id === undefined && plano.usuario_id === undefined),
  );

  // Prévia (a mesma usada na confirmação da interface).
  const resumoBackup = repositorio.inspecionarBackupLocal(backup.conteudo);
  conferir('Prévia identifica a dona', 'Maria Teste', resumoBackup.nome);
  conferir('Prévia conta os check-ins', 4, resumoBackup.total_checkins);

  // Arquivos inválidos são recusados com mensagens amigáveis (400).
  try {
    repositorio.inspecionarBackupLocal('isto não é json');
    conferir('Arquivo que não é JSON recusado', '400', 'não recusou');
  } catch (erro) {
    conferir('Arquivo que não é JSON recusado', 400, (erro as { status: number }).status);
  }
  try {
    repositorio.inspecionarBackupLocal('{"aplicativo":"outro-app"}');
    conferir('JSON de outro app recusado', '400', 'não recusou');
  } catch (erro) {
    conferir('JSON de outro app recusado', 400, (erro as { status: number }).status);
  }

  // Simula OUTRO dispositivo: o armazenamento recomeça completamente vazio.
  armazenamento.clear();
  const restaurado = await repositorio.importarProgressoLocal(backup.conteudo);
  conferir('Importação devolve a dona', 'Maria Teste', restaurado.usuario.nome);
  conferir(
    'Importação já abre a sessão',
    true,
    String(armazenamento.getItem('protocolfit_token')).startsWith('local:'),
  );
  conferir('Aceite do termo restaurado no destino', true, termoFoiAceito());

  // O progresso inteiro continua disponível no "novo" dispositivo.
  const planoRestaurado = await repositorio.buscarPlanoAtualLocal();
  conferir(
    'Treino restaurado no novo dispositivo',
    'Hipertrofia Split Clássico — 5 dias (ABCDE)',
    planoRestaurado.treino.nome,
  );
  conferir('Versão do treino preservada', 4, planoRestaurado.treino.versao);
  conferir('Peso do perfil preservado', 79.5, planoRestaurado.perfil.peso_kg);
  const evolucaoRestaurada = await repositorio.listarEvolucaoLocal();
  conferir('Pesagens restauradas', 2, evolucaoRestaurada.length);
  const checkinsRestaurados = await repositorio.buscarCheckinsLocal();
  conferir('Check-ins restaurados', 4, checkinsRestaurados.total);
  conferir('Sequência de dias preservada', 3, checkinsRestaurados.sequencia_atual);

  // A mesma senha continua funcionando (o hash viajou no arquivo).
  const loginRestaurado = await repositorio.entrarLocal({ email: 'maria@teste.com', senha: 'senhaSegura123' });
  conferir('Mesma senha funciona no novo dispositivo', 'Maria Teste', loginRestaurado.usuario.nome);

  // Reimportar no MESMO navegador substitui a conta — nunca duplica. E contas
  // de outras pessoas que já existam aqui ficam intactas.
  await repositorio.cadastrarLocal({ nome: 'Vizinha Local', email: 'vizinha@teste.com', senha: 'senhaSegura123' });
  await repositorio.importarProgressoLocal(backup.conteudo);
  const bancoDepois = JSON.parse(armazenamento.getItem('protocolfit_banco_local') ?? '{}') as {
    contas?: { email?: string }[];
  };
  conferir(
    'Reimportar não duplica a conta',
    1,
    (bancoDepois.contas ?? []).filter((conta) => conta.email === 'maria@teste.com').length,
  );
  conferir(
    'Conta de outra pessoa preservada',
    true,
    (bancoDepois.contas ?? []).some((conta) => conta.email === 'vizinha@teste.com'),
  );
  const checkinsAposReimportar = await repositorio.buscarCheckinsLocal();
  conferir('Check-ins não duplicam na reimportação', 4, checkinsAposReimportar.total);

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

# TEAM_001 — Portabilidade de progresso (exportar/importar)

## Missão
Permitir que o usuário leve o progresso entre dispositivos:
- **Exportar progresso**: baixa um arquivo JSON com conta, perfil, planos
  (treino/dieta, inclusive versões antigas), pesagens e check-ins.
- **Importar progresso**: restaura esse arquivo em outro navegador/dispositivo,
  recriando a conta (com o mesmo hash de senha) e abrindo a sessão.

Também: commits desta equipe NÃO carregam trailer/co-autor da ferramenta —
apenas o autor configurado no git do usuário (`leostella97`).

## Decisões de design
- Só existe no **modo navegador** (MODO_LOCAL): no modo servidor os dados já
  vivem no backend e basta fazer login no outro dispositivo. A UI fica oculta
  fora do modo local.
- O backup NÃO carrega ids internos (`id`, `usuario_id`): na importação todos
  os ids são recriados via `proximoId`, evitando colisão com contas já
  existentes no navegador de destino.
- Se o e-mail importado já existir no navegador, a conta antiga e seus dados
  são substituídos pelo snapshot do arquivo (importação = restauração fiel).
- O aceite do termo de uso viaja no backup (`aceite_do_termo`): quem já aceitou
  não precisa aceitar de novo no novo dispositivo.
- O arquivo contém o hash da senha — a interface avisa para guardá-lo como
  uma senha.
- Fluxo de importação no perfil tem confirmação em 2 etapas com "prévia" do
  backup (nome, e-mail, data, totais); na tela de login a importação é direta
  (não há sessão para proteger).

## Pontos tocados
- `apps/web/src/lib/repositorio-local.ts` — seção PORTABILIDADE:
  `exportarProgressoLocal`, `inspecionarBackupLocal`, `importarProgressoLocal`.
- `apps/web/src/lib/api.ts` — wrappers `exportarProgresso`, `inspecionarBackup`,
  `importarProgresso` (501 fora do modo local).
- `apps/web/src/components/portabilidade/botao-importar-progresso.tsx` — novo.
- `apps/web/src/components/portabilidade/cartao-portabilidade.tsx` — novo.
- `apps/web/src/app/painel/perfil/page.tsx` — cartão antes de "Sair da conta".
- `apps/web/src/app/login/page.tsx` — entrada discreta de importação.
- `apps/web/scripts/testar-repositorio-local.ts` — seção de testes 12).
- `README.md` — seção documentando o recurso.

## Estado
- [x] Testes de base passando antes da alteração (47/47)
- [x] Implementação
- [x] Testes + typecheck + build:pages verdes depois (72/72, tsc limpo, build ok, PWA ok)
- [x] Commit sem co-autor de ferramenta (apenas `leostella97`)

## Parte 2 — limpeza de crome de ferramenta + publicação
- `devIndicators: false` no `next.config.ts`: remove o botão circular "N" do
  DevTools do Next no modo dev (nunca existiu no build estático do Pages).
- O botão "Send element" era do overlay do preview do Devin — não é código do
  site; basta navegar em localhost:3000 direto (sem a URL de preview).
- Push na `main` feito: o workflow `deploy-pages.yml` compila e publica no
  GitHub Pages automaticamente.

## Parte 3 — sincronização pesagem ↔ "Peso atual" + README
Regra adotada: **o "peso atual" do perfil é sempre a pesagem mais recente**
(maior `data`; em empate, maior `id`). Aplicada num único ponto por modo:

- **Servidor** (`apps/api/src/bd/banco.ts`): `salvarPesagemDoDia` faz o upsert
  por data e, em seguida, grava em `perfis.peso_kg` o valor de
  `buscarUltimaEvolucao` (`ORDER BY data DESC, id DESC`). Cobre de uma vez as
  rotas `/api/evolucao`, `/api/perfil/corpo` e `/api/checkin`.
- **Navegador** (`repositorio-local.ts`): `registrarPesagemLocal` passou a usar
  `salvarPesagemDoDiaNoBanco` (antes fazia `push` direto — podia duplicar dois
  pontos no mesmo dia, divergindo do servidor). Nova `sincronizarPesoAtual`
  aplica a mesma regra de "mais recente".
- **UI**: `painel/page.tsx` recarrega o perfil (`buscarContaAtual`) após
  pesagem nova e após check-in com peso — "Peso atual", gráfico e o valor
  sugerido no formulário mudam juntos. `painel/perfil/page.tsx` idem após a
  pesagem do histórico.
- Efeito colateral proposital: `atualizarCorpo` continua escrevendo a pesagem
  do dia — os dois caminhos convergem para o mesmo estado.
- README: linha de atribuição
  `🤖 *Projeto desenvolvido com auxílio de inteligência artificial` no rodapé.

### Verificação (parte 3)
- `testar:local`: 77/77 (3 asserts novos: pesagem→peso atual, mesmo-dia não
  duplica + peso acompanha, pesagem retroativa NÃO altera o peso atual;
  contagens de pesagens no backup 2→3).
- `tsc --noEmit` (web e api): limpo.
- `build:pages`: ok (12 páginas estáticas, PWA validado).

## Notas de transferência
- Formato do backup: `{ aplicativo: 'protocolfit', tipo: 'progresso', versao: 1, ... }`.
  Se o formato evoluir, subir `VERSAO_DO_BACKUP` e tratar a leitura de versões
  antigas em `interpretarBackup` (repositorio-local.ts).
- `NEXT_PUBLIC_BASE_PATH` é usado no recarregamento pós-importação para não
  perder o prefixo `/ProtocolFit` do GitHub Pages.
- A dev server para testar a UI: `NEXT_PUBLIC_MODO_LOCAL=true npx next dev -p 3000`.

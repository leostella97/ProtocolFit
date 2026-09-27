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

## Notas de transferência
- Formato do backup: `{ aplicativo: 'protocolfit', tipo: 'progresso', versao: 1, ... }`.
  Se o formato evoluir, subir `VERSAO_DO_BACKUP` e tratar a leitura de versões
  antigas em `interpretarBackup` (repositorio-local.ts).
- `NEXT_PUBLIC_BASE_PATH` é usado no recarregamento pós-importação para não
  perder o prefixo `/ProtocolFit` do GitHub Pages.
- A dev server para testar a UI: `NEXT_PUBLIC_MODO_LOCAL=true npx next dev -p 3000`.

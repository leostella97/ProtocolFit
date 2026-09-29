# TEAM_004 — Checklist de exercícios concluídos → check-in do dia

## Missão
Permitir marcar cada exercício do treino como CONCLUÍDO durante a sessão e,
quando todos os exercícios do dia forem concluídos, registrar o treino como
feito no check-in diário automaticamente. Também há um botão manual
"Concluir treino de hoje" para quem não usa a checklist.

## Decisões de design
- **Estado da checklist é efêmero e local**: localStorage com chave
  `protocolfit_treino_concluido:{planoId}:{AAAA-MM-DD}:{diaIndice}` — zera
  sozinho a cada dia (a data faz parte da chave) e por plano. Não vai para o
  banco (nenhum dos modos): é o progresso da sessão de hoje, não dado do
  plano. O registro durável continua sendo o check-in (`treino_feito`).
- **Check-in automático**: ao concluir o ÚLTIMO exercício do dia, chama
  `salvarCheckin({ treino_feito: true })` — o merge do check-in preserva
  água/dieta/observação já registrados (regra já existente nos dois modos).
  Desmarcar um exercício depois NÃO desfaz o check-in (o usuário controla
  isso pelo cartão de check-in do painel).
- **Botão manual por aba**: cada "Dia N" mostra o progresso (x/y) e o botão
  "Concluir treino de hoje" — cobre quem treina sem marcar um a um.
- O cartão do exercício fica esverdeado e o nome riscado quando concluído;
  o anel/botão de troca (TEAM_003) e os campos seguem funcionando.

## Pontos tocados
- `apps/web/src/app/painel/treino/page.tsx` — helpers de progresso
  (chave/ler/gravar), estado por dia, efeito de carga inicial, toggle do
  exercício no cartão, progresso + botão por aba, check-in automático.
- `.teams/TEAM_004_checkin-exercicio-concluido.md` — este arquivo.

## Estado
- [x] Testes de base passando antes da alteração (92/92)
- [x] Implementação
- [x] Testes + typecheck + build:pages verdes depois
  (tsc web+api limpo · testar:local 92/92 · build:pages 12 páginas + PWA ok)
- [x] Commit sem co-autor de ferramenta (apenas `leostella97`) — `7db7b22`

## Notas de transferência
- A checklist NÃO é isolada por usuário no mesmo navegador — a chave usa o
  `planoId`, que é único por conta (ids globais do banco local / SQLite).
- Se um dia a persistência por exercício precisar ir ao servidor, o ponto de
  partida é a mesma chave — hoje ela vive só no dispositivo, por ser estado
  de sessão.

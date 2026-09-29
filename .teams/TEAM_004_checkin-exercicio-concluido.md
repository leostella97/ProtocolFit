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

## Parte 2 — Edição de "Meus dados" + seta de voltar do login

Pedido: perfil com possibilidade de alterar "Meus dados"; remover a seta de
voltar da tela de login (seta só deve existir para voltar entre telas do app).

Decisões:
- O cartão "Meus dados" do perfil ganhou modo de edição (botão "Editar"):
  sexo, faixa etária, altura, objetivo, modalidade e dias disponíveis.
- Salvar chama `salvarPerfilEGerarPlanos` (POST /perfil) — que já faz UPSERT
  do perfil nos dois modos e REGENERA treino e dieta. Regenerar é inevitável:
  objetivo/modalidade/dias mudam o plano inteiro. Aviso explícito no form.
- Peso NÃO entra no formulário: segue pelo registro de pesagem para não
  pular o histórico de evolução (POST /perfil não grava pesagem).
- Se a combinação mudou e o estilo atual não existe nela, `variacao_treino`
  volta para null (clássico) — cada variação só vale para modalidade+
  objetivo+dias específicos; o seletor de estilo é ressincronizado.
- Login: removida a seta "← Início" (só devolvia à landing). As setas de
  voltar DENTRO do painel (mobile header + botão "Voltar") já são
  hierárquicas (→ dashboard) e somem na raiz — mantidas, pois são a
  "mudança de tela" pedida.

Pontos tocados: `apps/web/src/app/painel/perfil/page.tsx`,
`apps/web/src/app/login/page.tsx`, este arquivo.

## Estado
- [x] Testes de base passando antes da alteração (92/92)
- [x] Implementação
- [x] Testes + typecheck + build:pages verdes depois
  (tsc web+api limpo · testar:local 92/92 · build:pages 12 páginas + PWA ok —
  revalidados também após a Parte 2)
- [x] Commit sem co-autor de ferramenta (apenas `leostella97`) — `d141068`

## Notas de transferência
- A checklist NÃO é isolada por usuário no mesmo navegador — a chave usa o
  `planoId`, que é único por conta (ids globais do banco local / SQLite).
- Se um dia a persistência por exercício precisar ir ao servidor, o ponto de
  partida é a mesma chave — hoje ela vive só no dispositivo, por ser estado
  de sessão.

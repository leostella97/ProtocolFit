# TEAM_017 — Líquido no treino + dropdown de objetivo na Dieta

## Pedidos
> 1. "Incluir no treino: Form quanto líquido bebeu; sincronizar com liquido
>    global; incrementar liquido treino no checkin editável"
> 2. "treino: junto com outros dropdown para mudar treino incluir dropdown
>    objetivo" — o dropdown de Objetivo JÁ existia no treino (TEAM_014);
>    confirmado com o usuário que o pedido era levá-lo à página da **Dieta**.

## Interpretação
- **"Form quanto líquido bebeu"**: um formulário dentro da página do treino
  (`/painel/treino`) pergunta quantos ml o usuário bebeu (ex.: durante a
  sessão), com atalhos rápidos.
- **"Sincronizar com líquido global"**: o líquido global do dia é o campo
  `agua_ml` do check-in diário — UMA única fonte de verdade. O formulário do
  treino mostra o total atual do dia e grava no mesmo campo.
- **"Incrementar líquido treino no check-in editável"**: o valor registrado
  no treino SOMA no `agua_ml` do check-in de hoje (incremento, não
  sobrescrita); o cartão de check-in do painel segue editável — quem abrir o
  painel vê o total já com a contribuição do treino.

## Design
- **Sem mudança de API/contrato**: `POST /api/checkin` já faz merge por
  campo — enviar só `agua_ml` preserva treino/dieta/peso/observação do dia.
  Antes de gravar, o componente rebusca o resumo (`buscarCheckins()`) para
  somar sobre o valor MAIS FRESCO (evita clobber se o usuário editou água
  no painel com a página do treino aberta).
- **Componente novo** `cartao-liquido-treino.tsx`: total do dia + barra de
  progresso contra a meta (`dieta.meta.agua_ml`), campo "quanto você
  bebeu?" com atalhos +250/+500 e botão "Registrar no check-in".
- **Função pura** `somarAguaDoDia(atualMl, adicionalMl)` em
  `checkin-util.ts` — valida e devolve o novo total (testável sem DOM).
- **Constante compartilhada** `AGUA_MAXIMA_ML = 10000` em `checkin-util.ts`
  — antes o literal 10000 estava espalhado em cartao-checkin e
  repositorio-local (o servidor mantém a constante própria, outro lado do
  contrato).

## Design — dropdown de objetivo na Dieta
- A montagem do corpo de POST /perfil para troca de objetivo (fallbacks de
  `variacao_treino` e `variacao_dieta` na nova combinação) virou a função
  pura **`montarCorpoParaNovoObjetivo()`** em `util.ts` — fonte única usada
  pelas páginas de treino e de dieta (antes: regra só no treino).
- A Dieta ganhou o seletor "Objetivo" ao lado de "Estilo de dieta"; os dois
  se desabilitam mutuamente durante a regeneração. O novo id de dieta zera
  a checklist de refeições sozinho (a chave é por plano+dia civil).

## Arquivos
- `apps/web/src/components/painel/cartao-liquido-treino.tsx` (novo)
- `apps/web/src/lib/checkin-util.ts` (constante + função pura)
- `apps/web/src/lib/util.ts` (montarCorpoParaNovoObjetivo — função pura)
- `apps/web/src/app/painel/treino/page.tsx` (estado + integração + refatoração)
- `apps/web/src/app/painel/dieta/page.tsx` (dropdown de objetivo)
- `apps/web/src/components/painel/cartao-checkin.tsx` (usa a constante)
- `apps/web/src/lib/repositorio-local.ts` (usa a constante)
- `spec/checkin-util.spec.ts` (testes de somarAguaDoDia)
- `spec/util.spec.ts` (testes de montarCorpoParaNovoObjetivo)
- `README.md` (seção "Check-in diário" documenta o cartão do treino)

## Baseline (antes de alterar)
- Jasmine: 74 specs, 0 falhas
- testar:local: 103 verificações, 0 falhas
- typecheck web: limpo

## Verificação (resultado)
- [x] Jasmine — 86 specs, 0 falhas (6 de somarAguaDoDia + 6 de
      montarCorpoParaNovoObjetivo)
- [x] typecheck web — limpo
- [x] build api (tsc) — limpo
- [x] build:pages + verificação PWA — verde
- [x] testar:local — 103/103

## Decisões
- O cartão fica FORA das abas de dia (entre o cartão de tempo do plano e as
  abas): o líquido é do DIA civil, não de uma aba de treino específica.
- Atalhos +250/+500 somam no CAMPO (mesmo padrão do cartão de check-in) —
  o registro acontece no botão, com feedback "Registrado ✓".
- Estouro do teto diário NÃO trunca em silêncio: exibe erro com o valor
  máximo — o usuário ajusta manualmente se quiser.

## Bloqueios / TODO
- Nenhum bloqueio. Sem TODOs restantes.
- Nota de handoff: o fluxo "rebusca → soma → POST" cobre edições feitas no
  painel com o treino aberto; duas abas registrando líquido NO MESMO
  instante seguem last-writer-wins (janela de ~ms, aceitável para um app
  pessoal — se um dia virar problema, o caminho limpo é um campo de
  incremento atômico no POST /checkin).

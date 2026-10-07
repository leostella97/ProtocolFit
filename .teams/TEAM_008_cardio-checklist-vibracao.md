# TEAM_008 — Cardio com distância/tempo, checklist persistente e vibração do timer

## Missão
Pedido do usuário, em três frentes:

1. "Cardios colocar distância e/ou tempo invés de séries repetições".
2. "Check no treino exercício não está guardando para mostrar na próxima visita".
3. "Quando timer acabar vibrar dispositivo".

## 1. Cardio: distância e/ou tempo

### Causa raiz
`montarDia()` (nos dois motores, API e navegador) sobrescrevia séries,
repetições e descanso de TODOS os exercícios com a regra do objetivo do
usuário — regra feita para musculação. "Corrida leve 20–30 min" virava
"3×10–12 reps" na cópia do plano. Além disso não existia campo de distância.

### Modelo de dados
Novo campo opcional `distancia_km` (null = sem meta) em `ModeloExercicio`
(`tipos-modelos.ts` API+web), `ExercicioDoPlano` (`tipos.ts` API+web),
`EdicaoDeExercicio` e `CorpoEdicaoExercicio` (`api.ts`).

Semântica dos campos no grupo `cardio` (documentada em `montadorPlano.ts`):
- `series === 1` → trabalho contínuo; `repeticoes_min/max` = MINUTOS alvo.
- `series > 1` → intervalado; `repeticoes_min/max` = SEGUNDOS por tiro.
- `distancia_km` → meta de km, independente das anteriores.

### Motor (API + espelho web, paridade mantida)
- `montarDia`: cardio preserva `series/repeticoes/descanso` DO MODELO;
  `distancia_km` é copiada para a cópia do usuário.
- `aplicarEdicaoTreino`: no cardio, `repeticoes` é alvo exato (sem a
  amplitude artificial `+2` usada para reps de musculação); `distancia_km`
  editável (null remove a meta).
- `aplicarTrocaDeExercicio`: a distância vem do exercício NOVO
  (`alternativa.distancia_km`), não do slot antigo.

### Rotas e repositório local
- `PATCH /plano/treino/:id`: o exercício alvo é resolvido ANTES da validação
  de reps; cardio aceita até `tempo_cardio_max` (600), musculação segue 1–50.
  `distancia_km` validada (número finito, 0 < km ≤ 500, null limpa).
- `repositorio-local.ts`: mesmas regras (espelho do modo navegador).

### Modelos
`distancia_km` adicionado só onde o nome já carrega distância:
`Corrida 400m` (0,4 km) e `Corrida 1km` (1 km) em
`apps/api/modelos/treinos/academia/hipertrofia/5dias-crossfit.json`
(edição cirúrgica; `apps/web/public/modelos` é gerado no build:pages).

### UI (treino/page.tsx + util.ts)
- `formatarAlvoDoExercicio()` em `util.ts`: musculação → "3×10–12";
  cardio contínuo → "20–30 min"; intervalado → "8 tiros de 15–20 s";
  com distância → "1,0 km" / "2,0 km · 15–20 min"; sem meta → "tempo livre".
- Cartão do exercício: linha "Alvo: …" no topo; no cardio os campos viram
  "Tiros (1 = contínuo)", "Tempo (min)" ou "Tempo por tiro (s)" e
  "Distância (km)" opcional; carga some (não se aplica).

## 2. Checklist persistente (progresso-treino.ts, novo)

Antes: chave `protocolfit_treino_concluido:{planoId}:{DATA}:{dia}` — a data
na chave fazia as marcas "sumirem" na visita seguinte (o usuário reclamou
exatamente disso).

Agora: chave `{planoId}:{dia}` SEM data; a data vai no VALOR
(`{ data, indices }`). Regra:
- marcas de hoje → restauradas (mesmo de antes);
- marcas de outro dia com sessão INCOMPLETA → restauradas (continua de onde
  parou — o pedido);
- marcas de outro dia com sessão CONCLUÍDA → descartadas (treino feito,
  dia novo = sessão nova);
- índices fora da grade atual (plano encolheu) são filtrados;
- chaves de outros planos e do formato legado (com data) são podadas na
  primeira gravação.

`treino/page.tsx` perdeu os helpers locais (`chaveDoProgresso`,
`lerConcluidos`, `gravarConcluidos`) — usa o módulo novo. O rótulo passou de
"Sessão de hoje" para "Progresso da sessão" (as marcas podem vir de outra
visita). O check-in (`treino_feito`) segue sendo o registro durável.

## 3. Vibração do timer (cronometro-descanso.tsx)

- Padrão reforçado: `[250, 120, 250, 120, 600]` (dois pulsos + um longo) —
  o aviso típico acontece com o aparelho no bolso.
- Chrome ignora `vibrate()`/som com a página em segundo plano ou a tela
  apagada. Ao zerar, o timer marca `concluiuOculto` quando `document.hidden`;
  num `visibilitychange` de volta à visibilidade ele primeiro recalcula o
  restante (se zerou oculto, completa AGORA, visível → vibra) e, se a
  conclusão já tinha rodado oculta, repete bipes + vibração + aviso visual.

## Testes
- `spec/util.spec.ts`: +6 casos de `formatarAlvoDoExercicio` (musculação,
  contínuo, distância-only, combinado, tiros, tempo livre).
- `spec/progresso-treino.spec.ts` (novo): mock de localStorage em memória;
  cobre persistência entre visitas, reset de sessão concluída, isolamento
  por dia/plano, poda de chaves legadas e valores corrompidos.

## Verificação
- `npm run typecheck` — limpo (api + web).
- `npm test` — 59 specs, 0 falhas.
- `testar:local` — 92/92.
- `testar:motor` — 20/20.
- `build:pages` — ok (12 páginas + PWA; usar `MSYS_NO_PATHCONV=1` no Git Bash).

## Notas de transferência
- Planos gerados ANTES desta equipe já têm cardio com reps de musculação
  na cópia do usuário — só planos novos/edits trazem a semântica de
  tempo/distância. Se o usuário reclamar, regenerar o plano resolve.
- Nenhum modelo JSON tinha distância além dos dois "Corrida" — se novos
  exercícios com km no nome entrarem, basta adicionar `distancia_km`.
- iOS/Safari não implementa `navigator.vibrate` — o aviso sonoro/visual
  cobre; não há API alternativa.

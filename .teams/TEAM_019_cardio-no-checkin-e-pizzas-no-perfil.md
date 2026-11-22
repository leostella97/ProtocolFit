# TEAM_019 — Cardio no check-in + gráficos pizza de consistência no perfil

## Missão
Pedido do usuário (tradução literal preservada):

> "inclua no checkin: cardio junto 'treino' feito e 'dieta' feita, abaixo dos
> ml de água ingerida, coloque modalidade do cardio, tempo, km; inclua
> gráficos pizza: força, hidratação, cardio no 'perfil' conforme os checkins,
> tenha base os estudos para calcular os dados do checkin conforme as
> informações do perfil do usuário"

## Interpretação (decisões de design)

1. **Check-in ganha um terceiro marcador**: `cardio_feito`, ao lado de
   `treino_feito` e `dieta_seguida` (mesma grade de botões). Como cardio é
   atividade física cumprida, ele **conta como "dia cumprido"** na sequência
   (regra vira `treino OU dieta OU cardio`) — documentado e coberto por spec.

2. **Detalhes do cardio abaixo da água**: quando `cardio_feito` está marcado,
   aparecem abaixo do bloco "Água (ml)": `cardio_modalidade` (seleção de
   lista fechada), `cardio_tempo_min` e `cardio_km`. Desmarcar o cardio limpa
   os três detalhes (dia sem cardio não carrega dados órfãos).

3. **Limites espelhados da TEAM_008**: tempo ≤ 600 min (`tempo_cardio_max`)
   e 0 < km ≤ 500 (regra de `distancia_km`) — mesmas validações na API e no
   repositório local.

4. **Pizzas no perfil = aderência dos últimos 7 dias** (janela civil rolante):
   - **Força**: sessões com `treino_feito` vs meta semanal do perfil
     (`frequencia_semanal` escolhida no onboarding).
   - **Hidratação**: dias com `agua_ml` ≥ meta diária do plano — meta que o
     motor já calcula por `peso_kg × AGUA_ML_POR_KG[objetivo]` (35 ml/kg;
     40 ml/kg para corrida/luta — regra de estudo já canônica no motor).
   - **Cardio**: minutos somados na semana vs meta de **150 min/semana** —
     diretriz OMS/ACSM de atividade aeróbica moderada (a mesma faixa citada
     como piso na literatura de saúde pública). A legenda também mostra os km.

   O cálculo é uma **função pura** em `checkin-util.ts`
   (`resumirSemanaDeCheckins`) — testável e única fonte usada pelo
   componente `graficos-consistencia.tsx`.

## Arquivos tocados (planejado)

- `apps/api/src/tipos.ts`, `apps/web/src/lib/tipos.ts` — 4 campos novos no
  `CheckinDiario`.
- `apps/api/src/bd/banco.ts` — colunas novas na `checkins` + migração leve
  (PRAGMA, mesmo padrão de `variacao_treino`).
- `apps/api/src/rotas/checkin.ts` — validações espelhadas.
- `apps/api/src/servicos/sequenciaDeCheckins.ts` — regra de dia cumprido.
- `apps/web/src/lib/checkin-util.ts` — constantes cardio, `CheckinParaCalendario`
  com `cardio_feito`, função pura da semana.
- `apps/web/src/lib/api.ts` — `CorpoCheckin` com os campos novos.
- `apps/web/src/lib/repositorio-local.ts` — validação, persistência, resumo
  e backup (normalização retrocompatível).
- `apps/web/src/components/painel/cartao-checkin.tsx` — toggle + campos.
- `apps/web/src/components/painel/graficos-consistencia.tsx` — NOVO, 3 pizzas.
- `apps/web/src/app/painel/perfil/page.tsx` — fetch dos check-ins + card novo.
- `apps/web/src/lib/constantes.ts` — cores das pizzas de consistência.
- `apps/api/src/util/constantes.ts` — `MODALIDADES_CARDIO` (espelho do web).
- `spec/*.spec.ts` — helpers atualizados + casos novos.
- `docs/API.md` — payload do check-in.

## Verificação (baseline antes de mexer)

- `npm test` — 87 specs, 0 falhas ✅
- `npm run typecheck` — limpo ✅

## Verificação (após a implementação)

- `npm run typecheck` — limpo (api + web) ✅
- `npm test` — **93 specs, 0 falhas** ✅ (6 casos novos: cardio cumprido
  na sequência API + local + calendário, `resumirSemanaDeCheckins`,
  normalização/limite de cardio no repositório local)
- `npm run testar:local` — 103/103 verificações ✅ (fluxo completo do modo
  navegador: onboarding → check-in com cardio → sequência → backup)
- `npm run testar:motor` — 20/20 verificações ✅ (paridade motor Node × navegador)
- `npm run build:pages` — build estático ok, 11 páginas + validação PWA ✅
- `npx tsc -p spec/tsconfig.json` — restam **3 erros PRÉ-EXISTENTES** de
  `Cannot find name 'process'` (`api.ts`, `carregadorModelos.ts`): falta
  `@types/node` instalado — dívida anterior a esta equipe (confirmado via
  `git stash`: idêntico antes do meu diff). Os 2 erros de `musculo_focado`
  em specs (deixados pela TEAM_018) foram corrigidos nesta equipe.

## Arquivos tocados (final)

Além do planejado, também:
- `spec/montador-plano.spec.ts`, `spec/util.spec.ts` — `musculo_focado: null`
  nos helpers de `Perfil` (requisito introduzido pela TEAM_018, specs
  estavam quebrando o tsc de spec desde então).
- `README.md` — seção do check-in explica cardio + métricas de consistência.

## Notas de transferência

- Contrato do check-in agora tem `cardio_feito` (bool), `cardio_modalidade`
  (lista fechada: corrida, ciclismo, caminhada, natacao, hiit, outro),
  `cardio_tempo_min` (1–600) e `cardio_km` (0–500). Omissão no PUT preserva
  o valor anterior — mesmo padrão dos demais campos.
- "Dia cumprido" = `treino_feito OR dieta_seguida OR cardio_feito` — aplicado
  nos três lugares: `sequenciaDeCheckins.ts` (API), `repositorio-local.ts`
  (espelho navegador) e `montarCalendarioDoMes` (calendário do card).
- `resumirSemanaDeCheckins(checkins, metaAguaMl, metaTreinos, metaCardioMin)`
  é a função pura dos 3 pizzas — testada em `spec/checkin-util.spec.ts`.
- Meta de cardio de 150 min/semana é a diretriz OMS/ACSM; meta de água vem
  do motor (`peso × 35–40 ml/kg` por objetivo); meta de força é a
  `frequencia_semanal` do perfil.
- TODO p/ equipe futura: instalar `@types/node` (devDependency) ou declarar
  `process` para zerar o `tsc -p spec/tsconfig.json`.

# TEAM_012 — Troca de exercício pelo mesmo músculo

**Data:** sessão atual · **Autor:** leostella97

## Pedido

> "treino substituir exercício por um exercício que afeta o musculo do
> exercício substituído"

## Diagnóstico

A troca (TEAM_003) já exige o mesmo **grupo** muscular — mas grupos amplos
misturam músculos diferentes:

- `pernas` (71 exercícios): quadríceps (agachamento/leg press/afundo),
  posterior de coxa (mesa flexora/stiff/terra romeno), glúteos (elevação
  pélvica/ponte), adutores (sumô/cossaco/lateral). Trocar agachamento por
  mesa flexora troca quadríceps por posterior — estímulo diferente.
- `ombro` (31): desenvolvimento/elevação frontal (anterior), elevação
  lateral (lateral), crucifixo inverso/face pull/Y-T-W (posterior).
- `core` (53): prancha/anti-extensão vs. abdominal flexão vs. rotação.
- Grupos já específicos ficam intactos: peito, costas, biceps, triceps,
  panturrilha, gluteos, posterior, trapezio, lombar (grupo == músculo).

## Plano

1. `musculoAlvo.ts` (API + navegador, idênticos): deriva o músculo-alvo por
   palavras-chave normalizadas (sem acento, minúsculas); grupos específicos
   devolvem o próprio grupo.
2. `listarAlternativasDeExercicio(modalidade, exercicio, excluidos)`:
   filtra por **músculo**; se o catálogo não tiver outra opção do mesmo
   músculo, cai para o grupo inteiro (fallback — trocar por outro do grupo
   é melhor que não trocar).
3. `aplicarTrocaDeExercicio`: mesma regra da listagem — exige o mesmo
   músculo quando existem opções dele (rejeita cross-músculo).
4. `AlternativaDeExercicio.mesmo_musculo: boolean` + rótulo do seletor na
   página de treino.
5. Specs + docs + verificação completa.

## Implementação

- **`musculoAlvo.ts`** (novo, `apps/api/src/motor/` + espelho
  `apps/web/src/lib/motor/`): `musculoAlvoDoExercicio(nome, grupo)` deriva o
  músculo por palavras-chave normalizadas (NFD sem acento, minúsculas).
  Ordem das checagens importa (posterior antes de lateral no ombro;
  oblíquos antes de estabilização no core — "prancha lateral" e
  "montanhista cruzado" são oblíquos).
- **`listarAlternativasDeExercicio(modalidade, exercicio, excluidos)`**:
  assinatura trocou `grupo` → exercício `{nome, grupo}`; filtra por músculo
  com fallback para o grupo inteiro.
- **`aplicarTrocaDeExercicio`**: mesmo-músculo obrigatório quando o catálogo
  tem outra opção livre do mesmo músculo (mesma regra da listagem —
  `nomesDoDia` excluídos da verificação de existência).
- `AlternativaDeExercicio.mesmo_musculo: boolean` (API + local); o seletor
  de troca mostra o músculo ("Trocar exercício (quadríceps)") via
  `rotuloDoMusculo` em `util.ts`; no fallback mostra o grupo como antes.

## Verificação (tudo verde)

- typecheck api+web + spec tsc: limpos
- Jasmine: **74 specs, 0 falhas** (9 novas — derivação, paridade dos dois
  motores, aceite mesma-músculo, rejeite cross-músculo, fallback, grupos)
- `testar:local` 95/95 · `testar:motor` 20/20
- Smoke no catálogo real: agachamento → 41 alternativas só quadríceps (sem
  mesa flexora); mesa flexora → só posteriores; elevação lateral → só
  laterais; prancha → só estabilização
- E2E API: `PATCH /trocar` rejeitou agachamento→mesa flexora (400 "mesmo
  músculo") e aceitou agachamento→agachamento búlgaro (carga recalculada)
- matriz 48/48 · dados possíveis 280/280 · build:pages + PWA ok

## Notas

- `nomesDoDia` excluído tanto na listagem quanto na verificação de troca:
  exercício repetido na sessão continua proibido.
- Fallback preservado: se o catálogo só tiver UMA opção do músculo, o
  seletor ainda oferece o resto do grupo (mesmo_musculo=false sinaliza).
- `normalizarNome` usa faixa literal de diacríticos U+0300–U+036F.


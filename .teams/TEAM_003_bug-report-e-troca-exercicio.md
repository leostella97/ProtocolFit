# TEAM_003 — Reportar bug + troca de exercício pelo mesmo músculo

## Missão
1. **Reportar bug na tela**: entrada visível com ícone de bug nos dois shells
   do painel — rodapé da `BarraLateral` (desktop) e cabeçalho mobile — abrindo
   uma issue nova no GitHub do projeto em aba separada.
2. **Trocar exercício do mesmo músculo**: cada exercício do treino ganha um
   seletor "Trocar por..." com as alternativas do MESMO grupo muscular da
   modalidade do usuário. A troca mantém o volume do slot (séries/reps/
   descanso, inclusive edições) e recalcula a carga pelo percentual do novo
   exercício.
3. **Sem Devin como contribuinte**: commits continuam só com `leostella97`
   (`"attribution": false` já gravado no config do usuário pela TEAM_002).

## Decisões de design
- **Destino do bug**: `https://github.com/leostella97/ProtocolFit/issues/new`
  (constante `URL_DE_REPORTE_DE_BUG` em `lib/constantes.ts`). Issues do GitHub
  mantêm os relatos organizados no próprio repositório público.
- **Locais estratégicos**: rodapé da barra lateral (desktop, ao lado de
  "Termo de uso"/"Sair") e ícone no cabeçalho mobile (sempre à mão). A barra
  inferior mobile continua só com navegação principal.
- **Catálogo de alternativas**: os modelos JSON mestres SÃO o banco de
  exercícios — `listarCatalogoDeExercicios(modalidade)` varre todos os
  modelos da modalidade e deduplica por nome (web: via `indice.json` +
  `buscarJson`; api: varredura de disco). Ambos têm cache por modalidade.
- **Regras da troca**: mesmo `grupo` obrigatório (validado em
  `aplicarTrocaDeExercicio`); exclui os exercícios que o dia já usa
  (inclusive o atual) para não duplicar exercício na sessão; carga
  recalculada com `arredondarCarga(peso × percentual_carga_peso_corporal)`
  (null = peso corporal).
- **Remontagem do cartão**: o `key` do `CartaoDeExercicio` inclui o nome do
  exercício — ao trocar, os campos reiniciam com os valores do novo
  exercício (carga recalculada aparece correta).

## Pontos tocados
- `apps/web/src/lib/constantes.ts` — `URL_DE_REPORTE_DE_BUG`.
- `apps/web/src/components/painel/barra-lateral.tsx` — botão "Reportar bug".
- `apps/web/src/app/painel/layout.tsx` — ícone de bug no cabeçalho mobile.
- `apps/web/src/lib/motor/carregadorModelos.ts` — catálogo/alternativas (fetch).
- `apps/api/src/motor/carregadorModelos.ts` — catálogo/alternativas (disco).
- `apps/web/src/lib/motor/montadorPlano.ts` + `apps/api/src/motor/montadorPlano.ts`
  — `TrocaDeExercicio` + `aplicarTrocaDeExercicio` (portas fiéis).
- `apps/web/src/lib/tipos.ts` — `AlternativaDeExercicio`.
- `apps/web/src/lib/repositorio-local.ts` — `listarAlternativasDeExercicioLocal`,
  `trocarExercicioLocal`.
- `apps/web/src/lib/api.ts` — wrappers `listarAlternativasDeExercicio`,
  `trocarExercicio`.
- `apps/api/src/rotas/planos.ts` — `GET /treino/:id/alternativas` e
  `PATCH /treino/:id/trocar`.
- `apps/web/src/app/painel/treino/page.tsx` — seletor de troca no cartão.
- `apps/web/scripts/testar-repositorio-local.ts` — fetch mock passa a ler
  `public/modelos` (gerado por copiar-modelos.mjs) + asserts da troca.

- `README.md` — tabela de endpoints ganhou as duas rotas novas.

## Estado
- [x] Testes de base passando antes da alteração (83/83)
- [x] Implementação
- [x] Testes + typecheck + build:pages verdes depois (92/92 com 9 asserts novos da troca, tsc limpo nos dois pacotes, build ok, PWA ok)
- [x] Commit sem co-autor de ferramenta (apenas `leostella97` — 460908d)

## Notas de transferência
- O mock de `fetch` do teste agora depende de `public/modelos` — o script
  executa `copiar-modelos.mjs` no início para garantir a cópia fresca.
- Se o bug report precisar ir para outro destino (e-mail, formulário), basta
  trocar `URL_DE_REPORTE_DE_BUG` em `lib/constantes.ts`.

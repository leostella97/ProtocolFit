# Arquitetura — ProtocolFit

## Visão geral

ProtocolFit é um SaaS de treino e dieta **100% determinístico** — nenhuma
chamada de IA: modelos JSON mestres + motor de cálculo próprio (Mifflin-St Jeor)
geram planos personalizados em milissegundos.

```
┌─────────────┐      ┌────────────────────┐      ┌──────────────┐
│  Next.js 16 │─────▶│  Fastify (apps/api)│─────▶│ SQLite (WAL) │
│  (apps/web) │      │  rotas → serviços  │      │ planos, perf │
│  App Router │      │  → motor → banco   │      │ check-ins    │
└──────┬──────┘      └────────────────────┘      └──────────────┘
       │                    │
       │                    ▼
       │              apps/api/modelos/  ← JSONs mestres (somente leitura)
       │                    │
       ▼                    ▼
  MODO NAVEGADOR (GitHub Pages):
  o MESMO motor roda no browser — apps/web/src/lib/motor/ é espelho do
  backend; public/modelos/ é cópia gerada por copiar-modelos.mjs.
```

## Dois modos, um motor

| | Modo servidor | Modo navegador (Pages) |
| :--- | :--- | :--- |
| Frontend | Next.js standalone/Docker | `output: 'export'` (estático) |
| Motor | `apps/api/src/motor/` | `apps/web/src/lib/motor/` (espelho) |
| Dados | SQLite | `repositorio-local.ts` + localStorage |
| Auth | bcrypt + JWT | PBKDF2 (Web Crypto) + token `local:` |

**Contrato de paridade**: os dois motores produzem números idênticos — o
script `testar:motor` garante a igualdade a cada mudança.

## Fluxo de dados

```
Onboarding → POST /api/perfil (transação)
  ├─ salvarPerfil
  └─ gerarPlanosParaPerfil
       ├─ buscarModeloTreino (modalidade/objetivo/dias/estilo + fallback)
       ├─ buscarModeloDieta  (objetivo[-estilo])
       ├─ calcularPlanoNutricional (TMB → TDEE → meta → macros → água)
       ├─ montarPlanoTreino  (cargas = % do peso corporal; prescricao_fixa
       │                      preserva volume do modelo; cardio usa tempo/km)
       ├─ montarPlanoDieta   (gramas = macros × % por refeição / item)
       └─ desativar antigos + inserir cópias novas (planos por usuário)
```

**Princípio central**: o usuário nunca edita os modelos mestres — edita uma
**cópia** gravada na linha `planos` (JSON em `conteudo`); versões antigas
ficam `ativo = 0` (histórico). Isso protege a base e permite "trocar estilo".

## Segurança (resumo)

- SQL somente via prepared statements (`?`) — nenhuma concatenação de input.
- Validação estrita de tipos/intervalos em TODA rota de escrita.
- Isolamento por `usuario_id` do JWT em toda consulta.
- Rate limit em `/api/auth`, bloqueio de conta, resposta genérica +
  tempo de bcrypt no login para não vazar existência do e-mail.
- JWT: HS256 pinned, 7 dias, segredo obrigatório via `PROTOCOLFIT_JWT_SECRET`
  em produção.
- Headers: nosniff, DENY, no-referrer, no-store em toda resposta.
- Erros: 500 genérico sem detalhes internos; mensagens amigáveis por status.

## Performance (resumo)

- SQLite em WAL; índices em `(usuario_id, tipo, ativo)` e `(usuario_id, data)`.
- `listarVariacoesDeTreino` / catálogo de exercícios: **cache** em memória
  (modelos mestres são somente leitura).
- Alternativas de exercício: rota em lote por dia (sem N+1).
- Escritas críticas em transações; frontend usa refs para timers/ouvintes
  com cleanup no unmount.

## Mapa de pastas

```
apps/api/            backend Fastify
  src/rotas/         endpoints HTTP (autenticacao, perfil, planos, checkin…)
  src/motor/         calculos, montadorPlano, carregadorModelos (espelhados)
  src/bd/banco.ts    SQLite + TODAS as queries (repositório)
  src/servicos/      geradorDePlanos, sequenciaDeCheckins
  modelos/           treinos/{modalidade}/{objetivo}/*.json + dietas/*.json
apps/web/            Next.js App Router
  src/app/           páginas (onboarding, painel/*)
  src/lib/motor/     ESPELHO do motor da API (paridade obrigatória)
  src/lib/           api.ts (despacha local↔servidor), repositorio-local.ts
  scripts/           copiar-modelos, verificar-pwa, testar-motor, testar-local
spec/                suíte Jasmine (npm test)
scripts/             validar-modelos.mjs, testes de integração (PS1), geradores
docs/                documentação (este arquivo, API.md, especificação)
.teams/              log de cada equipe (TEAM_XXX_*.md)
```

## Modelos de treino/dieta

- Padrão: `{dias}dias.json` — matriz completa modalidade × objetivo × 2–7 dias.
- Variação: `{dias}dias-{slug}.json` (estilo nomeado) + dieta pareada
  `dietas/{objetivo}-{slug}.json`.
- Campos especiais do exercício: `prescricao_fixa` (volume do modelo preserva),
  `distancia_km` (só cardio), `percentual_carga_peso_corporal`.
- Validados por `scripts/validar-modelos.mjs` (0 erros exigidos).

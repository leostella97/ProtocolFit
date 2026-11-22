# TEAM_020 — Manutenção: deps, segurança e performance

## Escopo (pedido do usuário)
- Atualizar p/ última versão: next.js, tailwind, shadcn/ui (radix), recharts,
  framer-motion, pwa, node.js, typescript, fastify, bcrypt(js);
- Qualidade de código + docs (sistema, API, comentários);
- Gargalos de memória, queries lentas, loops;
- Varredura de deps desatualizadas/vulneráveis (npm outdated + audit);
- Segredos expostos → env; falhas clássicas de segurança.

## Mapa de versões (levantado)
| pacote | atual | latest | risco |
|---|---|---|---|
| next | 16.4.0 | 16.4.6 | patch + corrige CRITICAL RCE (audit) |
| react/react-dom | 19.3.0 | 19.3.1 | patch |
| tailwindcss + postcss | 4.3.3 | 4.3.5 | patch |
| recharts | 3.10.1 | 3.11.0 | minor |
| framer-motion | 12.43.0 | 14.14.0 | MAJOR |
| lucide-react | 0.525.0 | 1.77.0 | MAJOR — remove ícones de marca |
| radix label/slot | — | 2.1.17/1.5.0 | patch/minor |
| fastify | 5.12.5 | 5.12.8 | patch + corrige bypass de header (audit) |
| @fastify/cors | 10.1.0 | 11.4.3 | MAJOR |
| @fastify/jwt | 10.2.4 | 10.2.8 | patch |
| @fastify/rate-limit | 11.2.1 | 11.3.0 | minor |
| better-sqlite3 | 12.11.1 | 13.2.0 | MAJOR (exige node>=22) |
| @types/better-sqlite3 | 7.6.13 | 9.6.0 | MAJOR (types) |
| bcryptjs | 3.0.2 | 3.0.3 | patch |
| dotenv | 16.6.1 | 18.0.10 | MAJOR |
| typescript | 5.9.3 | 7.0.2 | MAJOR (compilador nativo Go) |
| tsx | 4.19.x | 4.23.15 | range bump |
| tailwind-merge | 3.7.0 | 3.7.1 | patch |
| tw-animate-css | 1.3.3 | 1.4.0 | minor |
| jasmine | 7.0.0 | 7.0.0 | já latest |
| @types/node | 24.19.1 | 26.6.6 | MAJOR (types) |

## Decisões
- `engines` → `>=22` (better-sqlite3@13 exige; CI já usa node 22; local 24).
- lucide 1.x: Facebook/Instagram/Youtube removidos → componente local
  `icone-de-marca.tsx` com os mesmos paths SVG das versões antigas.
- glob@13 (vuln, dev-only via jasmine): tentar `overrides` p/ glob@14;
  se quebrar, aceitar como risco dev-only documentado.

## Execução
(em andamento)

## Resultado — atualizações aplicadas

Todos os pacotes foram para `latest` (semver-majors incluídos):

- **web:** next 16.4.6 (corrige RCE crítico do audit), react/react-dom 19.3.1,
  tailwindcss+postcss 4.3.5, recharts 3.11.0, framer-motion 14.14.0,
  lucide-react 1.77.0, radix label 2.1.17 / slot 1.5.0, tailwind-merge 3.7.1,
  tw-animate-css 1.4.0.
- **api:** fastify 5.12.8 (corrige bypass de header do audit), @fastify/cors
  11.4.3, @fastify/jwt 10.2.8, @fastify/rate-limit 11.3.0, bcryptjs 3.0.3,
  better-sqlite3 13.2.0, dotenv 18.0.10.
- **compartilhado:** typescript 7.0.2 (compilador nativo — typecheck e build
  passaram limpos), tsx 4.23.15, @types/node 26.6.6,
  @types/better-sqlite3 9.6.0.
- **engines** `>=22` (exigência do better-sqlite3@13) + `allowScripts` e
  README ajustados.
- **npm audit: 0 vulnerabilidades** — `overrides: { glob: ^14.0.6 }` na raiz
  sana glob+minimatch dentro do jasmine (dev-only); fast-uri 4.2.3 e
  ip-address 10.7.6 vieram via update transitivo.

## Quebras tratadas

- **lucide-react 1.x removeu ícones de marca** → `components/ui/icone-de-marca.tsx`
  (IconeFacebook/IconeInstagram/IconeYoutube) com os mesmos paths do lucide 0.x.
  Usos: `cartao-conquista.tsx` (compartilhar) e `treino/page.tsx` (link YouTube).
- **spec/tsconfig.json**: `types` ganhou `"node"` — zerou os 3 erros de
  `process` pré-existentes (dívida documentada na TEAM_019 quitada).

## Varreduras solicitadas

- **Segredos:** nenhum exposto. JWT via `PROTOCOLFIT_JWT_SECRET` (obrigatório
  em produção, fallback só-dev); `.env`/`.env.local` no .gitignore; só
  `.env.example` versionados. O `ca-pub-…` do AdSense em `layout.tsx` é
  identificador público por natureza (vai ao navegador de todo visitante) —
  não é segredo.
- **Segurança (clássicas):** SQLi — 100% prepared statements `?` (a única
  interpolação, em `atualizarCorpoDoPerfil`, junta literais de lista branca);
  XSS — nenhum `dangerouslySetInnerHTML`/eval (React escapa); auth — bcrypt 12,
  anti-enumeração por hash de referência, bloqueio 3 falhas/5h, JWT em
  `onRequest` de todas as rotas protegidas; headers — nosniff + frame DENY +
  no-referrer + no-store; rate limit 30/min (auth) e 300/min (público);
  erros 500 genéricos sem vazar internos; CORS por origem configurável.
  **Nada a corrigir.**
- **Performance:** sem gargalos acionáveis — streak por número de dia com
  Set (TEAM_011), respostas fatiadas (60 registros), índices cobrindo todos
  os padrões de query (email único, `usuario_id` em perfis/planos/evolução/
  checkins), loops de calendário/resumo O(n) sobre dados pequenos do usuário.

## Verificação final

- `npm test`: **97 specs, 0 falhas** (jasmine + glob@14 funcionando)
- `npm run typecheck`: limpo nos 2 workspaces (**TypeScript 7**)
- `npx tsc -p spec/tsconfig.json`: **limpo** (era: 3 erros pré-existentes)
- `testar:local`: **103/103** · `testar:motor`: **20/20** (paridade)
- `build:api`: limpo · `build:pages`: **OK** (Next 16.4.6 estático + PWA)
- Smoke real: API na 3340 responde `/api/saude` 200, `/api/opcoes` 200,
  login inválido → credenciais genéricas, `/api/eu` sem token → 401.

## Notas de transferência

- `icone-de-marca.tsx`: se o lucide reintroduzir marcas, migrar de volta.
- `overrides.glob`: remover quando o jasmine adotar glob@14 nativamente.
- Latente (documentado na TEAM_019): demais `type="number"` do app ainda
  têm o defeito de vírgula pt-BR (edição de exercício, líquido do treino,
  formulário de pesagem) — candidato a migração para `inputMode`.

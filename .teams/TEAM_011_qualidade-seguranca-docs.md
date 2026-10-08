# TEAM_011 — Qualidade, segurança, performance e documentação

**Data:** sessão da TEAM_011
**Autor do commit:** leostella97 <leonstella97@gmail.com>

## Pedido do usuário

> garanta a qualidade do código; gere documentação do sistema, documentação
> de API, documente código técnico com comentários estruturados; encontre
> gargalos de memória, consultas lentas ao banco de dados, otimize loops
> (corrija se achar); execute varredura de dependências em busca de pacotes
> desatualizados e/ou com vulnerabilidades conhecidas; procure por segredos
> expostos e mova-os para variáveis de ambiente mantendo a execução;
> verifique se o código projeto está protegido contra falhas clássicas de
> segurança

## Escopo da auditoria

1. **Dependências** — `npm audit` + `npm outdated`.
2. **Segredos** — varredura de chaves/tokens hardcoded; segredos devem vir de
   variáveis de ambiente.
3. **Segurança clássica** — SQLi, XSS, auth/JWT, CORS, headers, rate limit,
   path traversal, validação de entrada, mass assignment.
4. **Performance** — consultas SQLite, índices, N+1, caches sem limite,
   loops, listeners que vazam.
5. **Qualidade** — erros, redundâncias, código morto.
6. **Documentação** — visão do sistema, referência da API e comentários
   estruturados onde faltarem.

## Resultados

### Dependências

- `npm audit fix` + `npm update`: **0 vulnerabilidades** (sharp e
  source-map-js corrigidos — transitivos de build do Next).
- Majors fora de faixa NÃO atualizados de propósito (TypeScript 7,
  lucide-react 1.x, better-sqlite3 13, framer-motion 14, dotenv 18,
  @fastify/cors 11, @types/node 26) — exigem migração dedicada.
- @fastify/jwt 10.2.4, @fastify/rate-limit 11.2.1, radix, Next 16.4.0 e
  @types/node 24.19.1 aplicados dentro da faixa.

### Segredos

- Varredura completa: **nenhum segredo versionado** — só `.env.example`
  com placeholders, `.env`/`*.db` já no .gitignore.
- `ca-pub-*` (AdSense) é identificador PÚBLICO por design — vai no HTML.
- JWT segue em `PROTOCOLFIT_JWT_SECRET` (obrigatório em produção desde
  a TEAM_007); fallback só em dev.

### Correções de segurança

1. **Validação de tipos na autenticação** (API + espelho local): campos
   não-string (`{senha: 123}`) caíam em `TypeError` → 500. Agora 400.
   Verificado ao vivo.
2. **Pinning de algoritmo JWT**: `verify.algorithms = ['HS256']` —
   token `alg:none` rejeitado (testado).
3. **Headers de segurança** em toda resposta (`onSend`): nosniff, DENY,
   no-referrer, no-store — sem dependência nova.
4. **Rate limit nas rotas públicas** (`/api/opcoes`, `/api/saude`):
   300 req/min por IP. Rotas autenticadas sem teto (exigem JWT válido) —
   preserva os testes de integração de centenas de requisições.
   `/api/auth` mantém o teto mais estrito de 30/min.
5. **Senha do modo navegador**: SHA-256 puro → **PBKDF2-SHA-256**, sal
   aleatório por conta, 100 mil iterações (piso OWASP), comparação em
   tempo constante. Contas legadas migram silenciosamente no 1º login.
   Coberto por 3 verificações novas no `testar:local`.

### Performance

- Laço de sequência de check-ins reescrito sobre o NÚMERO do dia (API e
  espelho web) — eliminava um `Date`+string ISO por dia do streak.
- `paraData`/`deNumeroParaData` ficaram sem uso → removidas (regra do
  código morto).
- Timers órfãos: `cartao-corpo` (2×) e `formulario-nova-pesagem` ganharam
  `useRef` + cleanup no unmount (padrão já usado nos demais cartões).
- Auditoria de queries: só prepared statements, índices nos caminhos
  quentes; caches de variações/catálogo já existentes (TEAM_007).

### Qualidade

- Comentário obsoleto no carregador de modelos (faltava `luta`).
- Sem `dangerouslySetInnerHTML`/`innerHTML`/`eval` no app.

### Documentação

- **`docs/API.md`** — referência de todos os endpoints (corpos, respostas,
  códigos de erro, convenções de isolamento/transação/datas).
- **`docs/ARQUITETURA.md`** — visão do sistema: dois modos (servidor e
  navegador), fluxo de geração de planos, segurança, performance, mapa
  de pastas e esquema dos modelos.
- `README.md` aponta para os dois documentos novos.

## Verificação (tudo verde)

| Checagem | Resultado |
| :--- | :--- |
| `npm audit` | **0 vulnerabilidades** |
| `typecheck` (api + web) | limpo |
| Jasmine (`npm test`) | 65 specs, 0 falhas |
| `testar:local` | **95/95** (3 novas: PBKDF2 + migração legada) |
| `testar:motor` | 20/20 — paridade navegador ↔ servidor |
| `teste-da-matriz.ps1` | 48/48 |
| `teste-dos-dados-possiveis.ps1` | 280/280 |
| `build:pages` + PWA | ok |
| E2E ao vivo | headers, 400-em-vez-de-500, alg:none rejeitado, rate limit público 300 + auth 30 |

## Transferência

- **Majors pendentes** (débito consciente): TypeScript 7, lucide-react 1.x,
  better-sqlite3 13 + @types 9, framer-motion 14, dotenv 18,
  @fastify/cors 11, @types/node 26 — cada um pede migração/teste próprio.
- Contas LOCAIS criadas antes desta versão migram o hash para PBKDF2 no
  primeiro login (silencioso — a senha só existe naquele momento).

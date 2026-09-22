# ProtocolFit

> **Seu treino e sua dieta em segundos — calculados com ciência, não com achismo.**

O ProtocolFit é um SaaS web **100% gratuito** (sem assinatura e sem cartão de crédito) focado na **geração e gestão automatizada de treinos e dietas personalizadas**, projetado para **alta velocidade, baixo custo de infraestrutura e respostas instantâneas** — **zero dependência de APIs de IA**.

---

## ⚙️ Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js (App Router) |
| Estilização | Tailwind CSS v4 + shadcn/ui |
| Gráficos | Recharts (evolução de peso, macros) |
| Animações | Framer Motion |
| Backend | Node.js + TypeScript + **Fastify** |
| Banco de dados | **SQLite** (WAL) — leituras/escritas em milissegundos |
| Autenticação | Bcrypt + JWT — **3 tentativas erradas bloqueiam a conta por 5 horas** |
| Motor de cálculo | **Determinístico** (Mifflin-St Jeor) — sem LLMs |

## 📁 Arquitetura de diretórios

```
ProtocolFit/
├── package.json                     # monorepo npm workspaces (apps/api + apps/web)
├── tsconfig.base.json               # configuração TypeScript compartilhada
├── docs/
│   └── ESPECIFICACAO-DO-FRONTEND.md # contrato de implementação do frontend
└── apps/
    ├── api/                         # ── BACKEND (Fastify) ─────────────────────
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── .env.example             # PORTA, JWT secret, CORS
    │   ├── dados/                   # SQLite (protocolfit.db, criado em runtime)
    │   ├── modelos/                 # ── MODELOS JSON MESTRES (somente leitura)
    │   │   ├── LEIA-ME.md           # esquema dos modelos
    │   │   ├── treinos/             # MATRIZ COMPLETA: 36 arquivos (2 modalidades
    │   │   │   │                    # x 3 objetivos x 2..7 dias = academia e peso corporal)
    │   │   │   ├── academia/        # hipertrofia, emagrecimento, corrida (2dias..7dias cada)
    │   │   │   └── pesocorporal/    # hipertrofia, emagrecimento, corrida (2dias..7dias cada)
    │   │   └── dietas/              # emagrecimento.json, hipertrofia.json, corrida.json
    │   └── src/
    │       ├── servidor.ts          # bootstrap do Fastify (porta 3333)
    │       ├── tipos.ts             # contrato de tipos do domínio
    │       ├── bd/
    │       │   └── banco.ts         # conexão SQLite + esquema + repositório
    │       ├── motor/
    │       │   ├── calculos.ts      # Mifflin-St Jeor, macros, IMC, água (determinístico)
    │       │   ├── carregadorModelos.ts # leitura/fallback dos JSON mestres
    │       │   └── montadorPlano.ts # injeção de cargas/séries/gramas + edições
    │       ├── servicos/
    │       │   └── geradorDePlanos.ts  # clonagem do plano p/ o SQLite do usuário
    │       ├── rotas/               # opcoes, autenticacao, conta, perfil, planos, evolucao
    │       ├── plugins/
    │       │   └── autenticacaoJwt.ts  # JWT (@fastify/jwt)
    │       └── util/                # constantes de domínio + respostas
    └── web/                         # ── FRONTEND (Next.js) ────────────────────
        ├── package.json
        ├── next.config.ts
        ├── postcss.config.mjs
        └── src/
            ├── app/
            │   ├── layout.tsx       # fontes (Inter + Plus Jakarta Sans) e metadados
            │   ├── globals.css      # design system (tokens de cor da saúde)
            │   ├── page.tsx         # landing page persuasiva
            │   ├── login/           # login (bloqueio 3x/5h)
            │   ├── cadastro/        # criação de conta
            │   ├── onboarding/      # wizard de coleta em 5 passos
            │   └── painel/          # dashboard, treino, dieta, perfil
            ├── components/
            │   ├── ui/              # shadcn/ui (botao, cartao, input, abas...)
            │   └── painel/          # barra lateral, gráficos recharts, resumos
            └── lib/                 # api.ts, tipos.ts, armazenamento.ts, util.ts
```

## 🔄 O fluxo do usuário

1. **Onboarding** — o usuário cadastra-se e informa sexo, faixa etária (17 opções, de "15-19" a "79-83"), altura, peso (decimal), objetivo (emagrecimento | hipertrofia | corrida), frequência semanal, dias disponíveis e modalidade (academia | peso do corpo).
2. **Geração** — o backend cruza os filtros, localiza o modelo JSON mestre e injeta os valores calculados.
3. **Painel** — o usuário visualiza treino e dieta, **edita cargas e substitui alimentos na própria cópia**, **altera peso e altura direto no painel** (a altura aparece acima do peso), faz o **check-in diário** (treino, dieta, água, peso e observação, com sequência/recorde de dias) e solicita **recálculos** baseados na sua evolução física.

### ✅ Check-in diário

O painel tem o cartão **"Check-in de hoje"**: o usuário marca *treino feito*, *dieta seguida*, a água do dia (com atalhos de +250/+500 ml), o peso do dia (opcional, entra no gráfico) e uma observação. O sistema calcula automaticamente:

- **Sequência atual** (dias consecutivos cumpridos — treino **ou** dieta no dia);
- **Recorde** de sequência e **total** de check-ins;
- **Mini histórico** dos últimos 7 dias.

Regras: um check-in por dia por usuário (atualizar o mesmo dia não duplica) e a sequência só quebra quando um dia inteiro passa sem nenhuma marcação. No modo navegador (GitHub Pages) o check-in fica no `localStorage`; no modo servidor vai para a tabela `checkins` do SQLite.

## 🧮 A lógica de processamento no backend

- **Matriz de seleção por templates JSON** — `/modelos/treinos/{modalidade}/{objetivo}/{dias}dias.json` contém apenas a estrutura de exercícios; `/modelos/dietas/{objetivo}.json` contém os tipos de refeição. Sem arquivo exato de dias, o carregador escolhe o modelo mais próximo e ajusta (corte/repetição cíclica) de forma determinística.
- **Motor de cálculo determinístico** — `TMB (Mifflin-St Jeor) → fator de atividade → gasto total → déficit/superávit por objetivo → macros exatos em gramas`, com piso calórico de segurança (1500 kcal ♂ / 1200 kcal ♀), fibras (14 g/1000 kcal) e água (35–40 ml/kg). Cargas iniciais = fração do peso corporal (arredondada a 2,5 kg).
- **Clonagem para a conta do usuário** — o plano montado é gravado na tabela `planos` do SQLite com o id do usuário; recálculos criam nova versão e desativam a anterior.
- **Isolamento de dados** — o usuário lê e edita **unicamente** a cópia no SQLite; os JSON mestres ficam protegidos e intactos.

## 🔐 Segurança

- Senhas com hash **bcrypt** (12 rounds) — nunca em texto puro.
- Tokens **JWT** com validade de 7 dias.
- **3 tentativas de login falhas → conta bloqueada por 5 horas** (HTTP 423 com horas restantes).
- E-mails únicos (case-insensitive) e validação de perfil 100% no servidor.

## 🌱 Psicologia de cores (saúde)

| Cor | Significado | Uso |
| --- | --- | --- |
| Verde esmeralda (primária) | saúde, vitalidade, crescimento | botões, links, destaque |
| Teal/ciano (acento) | água, frescor, energia limpa | gráficos, gradientes |
| Branco-esverdeado (fundo) | leveza, higiene, respiro | fundo da aplicação |
| Verde-petróleo (texto) | confiança, leitura suave | tipografia |

## 🚀 Como rodar

```bash
# 1. Instalar dependências (raiz do monorepo)
npm install

# 1a. npm 12+: aprovar scripts de instalação nativos (SQLite e esbuild)
npm install-scripts approve better-sqlite3
npm install-scripts approve esbuild

# 2. Terminal 1 — subir a API (http://localhost:3333)
npm run dev:api

# 3. Terminal 2 — subir o frontend (http://localhost:3000)
npm run dev:web

# 4. (Opcional) Validar a API ponta a ponta
powershell -File scripts/teste-da-api.ps1           # fluxo completo (10 cenários)
powershell -File scripts/teste-da-matriz.ps1        # 36 combinações de treino vinculadas ao usuário
powershell -File scripts/teste-dos-dados-possiveis.ps1  # 212 perfis possíveis gerados (treino + dieta)
powershell -File scripts/teste-do-checkin.ps1       # check-in diário + alteração de peso e altura
```

Configurações opcionais em `apps/api/.env` (copie de `.env.example`): `PORTA`, `PROTOCOLFIT_JWT_SECRET`, `PROTOCOLFIT_ORIGEM_WEB`.

Build de produção: `npm run build` (compila API com `tsc` e frontend com `next build`).

## 🌍 Como hospedar no GitHub e colocar online

### 0. Modo navegador no GitHub Pages (sistema rodando de graça, sem servidor)

O ProtocolFit pode rodar **inteiro no navegador do visitante** — é assim que ele
funciona no GitHub Pages:

👉 **https://leostella97.github.io/ProtocolFit/**

Também funciona digitando **https://leostella97.github.io/** ou qualquer grafia
com a caixa trocada (ex.: `/protocolfit/`, `/PROTOCOLFIT/painel/`): o repositório
[leostella97.github.io](https://github.com/leostella97/leostella97.github.io)
serve um `404.html` que reconstrói a URL oficial e redireciona automaticamente.
Isso resolve a limitação do GitHub Pages, que diferencia maiúsculas de
minúsculas no caminho do projeto.

Nesse modo (ativado por `NEXT_PUBLIC_MODO_LOCAL=true`):

- O **motor de cálculo determinístico** (TMB, macros, montagem dos planos) roda no
  próprio navegador, a partir dos **36 modelos JSON** publicados como arquivos
  estáticos em `/modelos`.
- As **contas, perfis, planos e pesagens** ficam no `localStorage` do visitante
  (mesmas validações, mesmas mensagens e mesmos códigos de erro da API: 401, 409, 423).
- O **mesmo motor** do backend é usado: os números são **idênticos** aos do servidor
  (há teste automatizado comprovando — veja abaixo).
- **Nada é enviado a servidores**: cada visitante tem o seu próprio "banco" local.

A publicação é automática pelo workflow `.github/workflows/deploy-pages.yml`:
a cada push na `main`, o GitHub compila o site estático (`npm run build:pages`) e o
publica no Pages. Para publicar manualmente:

```bash
MODO_PAGES=true NEXT_PUBLIC_MODO_LOCAL=true NEXT_PUBLIC_BASE_PATH=/ProtocolFit npm run build:pages
# o site pronto fica em apps/web/out
```

**Verificações do modo navegador** (executadas também localmente):

```bash
npm run testar:motor --workspace @protocolfit/web   # motor do navegador == motor do servidor (16 verificações)
npm run testar:local --workspace @protocolfit/web   # fluxo completo: cadastro → plano → edições → recálculo (25 verificações)
```

### 1. Subir o código para o GitHub

```bash
# (já feito localmente: git init + commit inicial)
# 1) Crie o repositório em https://github.com/new (ex.: protocolfit)
# 2) Conecte e envie:
git remote add origin https://github.com/SEU-USUARIO/protocolfit.git
git push -u origin main
```

O repositório já inclui **CI no GitHub Actions** (`.github/workflows/ci.yml`): a cada push, o GitHub valida tipos e compila API + frontend automaticamente.

### 2. Colocar o sistema NO AR

O ProtocolFit usa **SQLite em disco** (pasta `apps/api/dados`), então precisa de um servidor com **disco persistente**. O GitHub guarda o código; as opções abaixo publicam o site. Tudo já está pronto nos arquivos `Dockerfile`, `docker-compose.yml` e `Caddyfile`.

**Opção A — VPS (recomendada; ex.: Hostinger, Hetzner, DigitalOcean):**
```bash
# No VPS (Ubuntu):
git clone https://github.com/SEU-USUARIO/protocolfit.git && cd protocolfit
# Crie o arquivo .env:
#   DOMINIO=seusite.com
#   PROTOCOLFIT_JWT_SECRET=um-segredo-forte-aleatorio
docker compose up -d --build
```
Resultado: `https://seusite.com` (site) e `https://seusite.com/api` (API), com HTTPS automático, banco persistente em volume Docker e reinício automático. Após cada atualização: `git pull && docker compose up -d --build`.

**Opção B — Render.com** (2 serviços Docker):
1. *Web Service* `protocolfit-api` → Dockerfile `apps/api/Dockerfile`, root `apps/api`, **disco persistente montado em `/app/dados`**, env `PROTOCOLFIT_JWT_SECRET` e `PROTOCOLFIT_ORIGEM_WEB=https://SEU-APP-WEB.onrender.com`.
2. *Web Service* `protocolfit-web` → Dockerfile `apps/web/Dockerfile`, root `apps/web`, env de build `NEXT_PUBLIC_URL_API=https://protocolfit-api.onrender.com/api`.
3. Acesse `https://protocolfit-web.onrender.com`.

**Opção C — Railway.app**: mesmo esquema — dois serviços com os Dockerfiles + volume em `/app/dados` + `NEXT_PUBLIC_URL_API` apontando para a URL pública da API.

> ⚠️ GitHub Pages **não** serve o sistema completo (só arquivos estáticos): o ProtocolFit precisa da API Fastify + SQLite rodando em servidor.

## 📱 Aplicativo instalável (PWA) com aviso de instalação

O ProtocolFit é um **PWA completo**: pode ser instalado no celular ou no
computador e funciona **offline**.

| Recurso | Como funciona |
| --- | --- |
| **Aviso para instalar** | Um cartão aparece no canto da tela assim que o app fica instalável (Android/Chrome/Edge, com o botão "Instalar agora"). No iPhone/iPad o aviso ensina o caminho *Compartilhar → Adicionar à Tela de Início*. Quem dispensar só vê o aviso de novo depois de 7 dias, e ele nunca aparece se o app já estiver instalado |
| **Manifesto** | `src/app/manifest.ts` → nome, cores da marca, `display: standalone`, ícones 192/512 + **maskable** (Android) e **atalhos** para Treino, Dieta e Perfil ao segurar o ícone |
| **Ícones** | Gerados por `npm run icones --workspace @protocolfit/web` (codificador PNG próprio, sem dependências): `icon-192`, `icon-512`, `icon-maskable-512`, `apple-touch-icon` (iOS) e `favicon` |
| **Modo offline** | `public/sw.js` (service worker): navegação com estratégia *rede primeiro* e cache como reserva; JS/CSS/imagens/modelos JSON com *cache primeiro* e atualização em segundo plano. Depois da primeira visita, o sistema abre e **gera planos sem internet** |
| **Verificação automática** | `npm run verificar:pwa --workspace @protocolfit/web` roda no fim de `build:pages`: confere manifesto, ícones, service worker e metadados — se o app deixar de ser instalável, o build quebra |

Para testar no seu aparelho: abra **https://leostella97.github.io/ProtocolFit/** no
celular e toque em **"Instalar agora"** no aviso (ou use o menu do navegador →
*Instalar aplicativo*).

## 🔌 Endpoints da API

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/saude` | Health check |
| GET | `/api/opcoes` | Opções do onboarding (faixas, objetivos, modalidades...) |
| POST | `/api/auth/cadastro` | Cria conta (retorna JWT) |
| POST | `/api/auth/login` | Login com bloqueio de segurança |
| GET | `/api/eu` | Conta logada + estado do onboarding |
| POST | `/api/perfil` | Salva perfil e **gera os planos** |
| GET | `/api/perfil` | Perfil salvo |
| POST | `/api/perfil/recalcular` | **Renova planos** pela evolução física |
| GET | `/api/plano/atual` | Plano vigente (perfil + treino + dieta) |
| PATCH | `/api/plano/treino/:id` | Edita carga/séries/repetições (cópia do usuário) |
| PATCH | `/api/plano/dieta/:id/substituir` | Substitui alimento (cópia do usuário) |
| POST | `/api/evolucao` | Registra pesagem |
| GET | `/api/evolucao` | Histórico de pesagens |

## 📝 Convenções do código

Todo o código está **comentado em português** e usa **nomes de variáveis, funções e componentes em português** (`calcularTMB`, `buscarPlanoAtual`, `gerarPlanosParaPerfil`...).

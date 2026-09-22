# Especificação do Frontend — ProtocolFit (guia para implementação)

Este documento é o contrato de implementação do frontend. Todo o código deve:

1. **Comentar todas as linhas de código em português** (ou blocos lógicos curtos com comentário por linha quando relevante).
2. **Nomear todas as variáveis, funções e componentes em português**.
3. Usar **apenas os componentes, tipos e funções já existentes** listados abaixo.
4. NÃO criar arquivos em `src/components/ui/` (já prontos), NÃO modificar `src/lib/*`, NÃO alterar `package.json`.
5. NÃO rodar `npm install` — dependências já instaladas.

---

## 1. Stack e caminhos

- Next.js 15 App Router (pasta `apps/web`). Rotas: `src/app/**/page.tsx`.
- Tailwind CSS v4 com tokens shadcn já configurados em `src/app/globals.css`.
- Ícones: `lucide-react`. Animações: `import { motion } from 'framer-motion'`.
- Gráficos: `recharts` (apenas painel).
- Apelido de importação: `@/` → `apps/web/src/`.

## 2. Componentes UI existentes (`@/components/ui/...`)

| Arquivo | Exportações |
|---|---|
| `button` | `Botao` (props: `variante`: `'padrao' \| 'destrutivo' \| 'contorno' \| 'secundario' \| 'fantasma' \| 'link' \| 'gradiente'`; `tamanho`: `'padrao' \| 'pequeno' \| 'grande' \| 'icone'`; `comoFilho` para usar com `<Link>` como filho) |
| `card` | `Cartao`, `CartaoCabecalho`, `CartaoTitulo`, `CartaoDescricao`, `CartaoAcao`, `CartaoConteudo`, `CartaoRodape` |
| `input` | `CampoDeEntrada` (input padrão) |
| `label` | `Rotulo` (aceita `htmlFor`) |
| `select` | `MenuDeSelecao` (select nativo estilizado, filhos = `<option>`) |
| `textarea` | `AreaDeTexto` |
| `badge` | `Selo` (variante: `'padrao' \| 'secundario' \| 'destrutivo' \| 'contorno'`) |
| `progress` | `BarraDeProgresso` (prop `valor` = 0..100) |
| `tabs` | `Abas` (prop `valorPadrao`), `ListaDeAbas`, `GatilhoDeAba` (prop `valor`), `ConteudoDeAba` (prop `valor`) — implementação leve, SEM Radix |
| `separator` | `Separador` |
| `skeleton` | `Esqueleto` |

## 3. Lib existente (`@/lib/...`)

### `api.ts` — funções prontas (todas retornam Promise)

```ts
import { cadastrarUsuario, entrarUsuario, buscarContaAtual, buscarOpcoes,
  salvarPerfilEGerarPlanos, recalcularPlanos, buscarPlanoAtual, editarExercicio,
  substituirAlimento, registrarPesagem, listarEvolucao, ErroDaApi,
  type CorpoPerfil, type CorpoEdicaoExercicio, type CorpoSubstituicao } from '@/lib/api';
```

- `cadastrarUsuario({nome, email, senha})` → `{token, usuario}`
- `entrarUsuario({email, senha})` → `{token, usuario}` (erro 423 = conta bloqueada; 401 = credenciais)
- `buscarContaAtual()` → `{usuario, perfil: Perfil|null, possui_planos: boolean}`
- `buscarOpcoes()` → `OpcoesDoSistema` (faixas_etarias, objetivos, modalidades, frequencias_semanais, dias_semana, seguranca)
- `salvarPerfilEGerarPlanos(corpo: CorpoPerfil)` → `{perfil, treino, dieta}` — CorpoPerfil: `{sexo, faixa_etaria, peso_kg, altura_cm, objetivo, frequencia_semanal, dias_disponiveis, modalidade, nivel?}`
- `recalcularPlanos()` → `{perfil, treino, dieta}`
- `buscarPlanoAtual()` → `PlanoCompleto` = `{perfil, treino, dieta}`
- `editarExercicio(planoId, {dia_indice, exercicio_indice, series?, repeticoes?, carga_kg?})` → `PlanoTreino`
- `substituirAlimento(planoId, {refeicao_indice, item_indice, alternativa_nome})` → `PlanoDieta`
- `registrarPesagem(pesoKg, data?)` → `RegistroEvolucao`
- `listarEvolucao()` → `RegistroEvolucao[]`
- `ErroDaApi` — classe de erro com `.status` e `.message` (mensagem já em português vinda da API). Sempre tratar com `try/catch` e exibir `erro.message`.

### `armazenamento.ts`

```ts
import { obterToken, guardarToken, guardarUsuario, obterUsuario, encerrarSessao, possuiSessao } from '@/lib/armazenamento';
```

### `tipos.ts` — todos os tipos (Perfil, PlanoTreino, PlanoDieta, RegistroEvolucao, OpcoesDoSistema, Usuario, RefeicaoDaDieta, ItemDaDieta, DiaDeTreino, ExercicioDoPlano, MetaDaDieta...).

### `util.ts`

```ts
import { combinarClasses, formatarData, formatarDecimal, rotuloDoObjetivo, rotuloDaModalidade, rotuloDoDia } from '@/lib/util';
```

### `constantes.ts` — cores p/ gráficos e animações:

```ts
import { CORES_DO_GRAFICO, CORES_DOS_MACROS, NOMES_DOS_MACROS, ANIMACAO_DE_ENTRADA, TRANSICAO_SUAVE } from '@/lib/constantes';
```

## 4. Design tokens (Tailwind v4 já mapeados)

`bg-background` `text-foreground` `bg-card` `text-card-foreground` `bg-primary` `text-primary-foreground` `bg-secondary` `text-secondary-foreground` `bg-muted` `text-muted-foreground` `bg-accent` `bg-destructive` `border-border` `ring-ring` — além das classes custom: **`gradiente-marca`** (fundo gradiente esmeralda→teal), **`texto-gradiente`** (texto com gradiente), **`sombra-suave`** (sombra verde), **`font-display`** (títulos).

- Cores de gráficos: `CORES_DO_GRAFICO.peso/.proteina/.carboidrato/.gordura/.calorias`; pizza: `CORES_DOS_MACROS` com `NOMES_DOS_MACROS`.
- Animações: `motion.div initial={ANIMACAO_DE_ENTRADA.escondido} animate={ANIMACAO_DE_ENTRADA.visivel} transition={TRANSICAO_SUAVE}`.

## 5. Texto persuasivo (psicologia de cores da saúde)

Tom: confiança científica + energia + simplicidade. Frases de apoio (use livremente):
- "Seu treino e sua dieta em segundos — calculados com ciência, não com achismo."
- "Zero inteligência artificial, zero erro de conta: fórmula Mifflin-St Jeor aplicada no seu corpo."
- "Planos 100% seus: edite cargas, troque alimentos e renove pela sua evolução."

---

# PARTE A — Landing, Autenticação e Onboarding

## Arquivos a criar

1. `apps/web/src/app/page.tsx` — Landing page (`'use client'`, framer-motion).
2. `apps/web/src/app/login/page.tsx` — Página de login.
3. `apps/web/src/app/cadastro/page.tsx` — Página de cadastro.
4. `apps/web/src/app/onboarding/page.tsx` — Wizard de onboarding em 5 passos.

## 1. Landing (`/`)

`'use client'`. Estrutura (uma página só, seções):

- **Cabeçalho fixo**: logo "ProtocolFit" (ícone `HeartPulse` do lucide + `font-display font-bold`), links âncora (Como funciona, Diferenciais), botões Entrar (fantasma) e "Começar grátis" (gradiente) → `/cadastro`.
- **Hero**: título grande `font-display` ("Seu treino e dieta personalizados em **segundos**" com `texto-gradiente` na palavra-chave), subtítulo persuasivo, 2 CTAs ("Criar meu plano grátis" → `/cadastro`, "Ver como funciona" âncora), prova social ("3 passos · 0 custo de IA · 100% ciência"). Animação de entrada escalonada (motion).
- **Faixa de estatísticas**: 4 números com contador simples (`motion` + `useEffect`), ex.: "3 objetivos", "17 faixas etárias", "0 chamadas de IA", "100% determinístico".
- **Como funciona**: 3 cartões com ícones (`ClipboardList`, `Calculator`, `Dumbbell`) — 1. Responda o onboarding, 2. Motor calcula TMB/macros, 3. Treine e evolua.
- **Diferenciais**: grade 2x2 (Zero IA = `ShieldCheck`; Milissegundos = `Zap`; Isolamento de dados = `Lock`; Edite à vontade = `SlidersHorizontal`).
- **Objetivos**: 3 cartões (Emagrecimento `Flame`, Hipertrofia `Dumbbell`, Corrida `Footprints`) com mini-descrição e seta para `/cadastro`.
- **CTA final**: painel gradiente-marca com título e botão branco "Criar meu plano grátis".
- **Rodapé**: logo, tagline e © ano ProtocolFit.

## 2. Login (`/login`)

`'use client'`. Cartão centralizado (max-w-md) com logo + título "Bem-vindo de volta". Campos: e-mail, senha (com botão olho `Eye`/`EyeOff`). Envio: `entrarUsuario` → `guardarToken(token)`, `guardarUsuario(usuario)` → `buscarContaAtual()` → redireciona `possui_planos ? '/painel' : '/onboarding'`. Erros em alerta vermelho (`ErroDaApi.message`; destacar bloqueio 423 com ícone `Lock`). Link "Criar conta" → `/cadastro`. Se já tiver token ao montar, redireciona p/ `/painel`.

## 3. Cadastro (`/cadastro`)

Idem visual. Campos: nome completo, e-mail, senha, confirmar senha. Validação local (nome ≥ 3, e-mail regex, senha ≥ 8, senhas iguais). Envia `cadastrarUsuario` → guarda token/usuário → `/onboarding`. Link "Já tenho conta" → `/login`.

## 4. Onboarding (`/onboarding`)

`'use client'`. Se sem token → `router.replace('/login')`. Carrega `buscarOpcoes()` no mount (skeleton enquanto carrega). Progresso visual no topo (BarraDeProgresso + "Passo X de 5"). Transição entre passos com `AnimatePresence` (slide). Estado único `useState` para o formulário. Passos:

1. **Seu corpo**: sexo (2 botões-cartão `Mars`/`Venus`), faixa etária (`MenuDeSelecao` com `opcoes.faixas_etarias`), altura em cm (`CampoDeEntrada` number), peso em kg (`CampoDeEntrada` number, `step 0.1`).
2. **Seu objetivo**: 3 cartões clicáveis com ícone (`Flame`, `Dumbbell`, `Footprints`), título e descrição (de `opcoes.objetivos`).
3. **Sua rotina**: frequência semanal (chips de `opcoes.frequencias_semanais`, ex.: "3x/semana") + dias da semana (chips toggle de `opcoes.dias_semana`, mínimo 1, usar `rotuloDoDia`).
4. **Seu local**: 2 cartões clicáveis (`opcoes.modalidades`, ícones `Building2` e `PersonStanding`).
5. **Revisão**: resumo em lista (sexo, faixa etária, altura, peso, objetivo, frequência, dias, modalidade) + botão "Gerar meu plano" (gradiente, loading com spinner `Loader2` animate-spin). Envia `salvarPerfilEGerarPlanos` com `nivel: 'iniciante'` e `frequencia_semanal` = número de dias selecionados. Sucesso → `router.push('/painel')` (e `router.refresh()`).

Botões Voltar/Avançar por passo; validar antes de avançar (mensagens amigáveis).

---

# PARTE B — Painel (área logada)

## Arquivos a criar

1. `apps/web/src/components/painel/barra-lateral.tsx` — sidebar de navegação.
2. `apps/web/src/app/painel/layout.tsx` — layout com guarda de sessão.
3. `apps/web/src/app/painel/page.tsx` — Dashboard.
4. `apps/web/src/app/painel/treino/page.tsx` — Treino editável.
5. `apps/web/src/app/painel/dieta/page.tsx` — Dieta com substituições.
6. `apps/web/src/app/painel/perfil/page.tsx` — Perfil, pesagem e recálculo.
7. `apps/web/src/components/painel/grafico-evolucao-peso.tsx` — recharts LineChart.
8. `apps/web/src/components/painel/grafico-macros.tsx` — recharts PieChart.
9. `apps/web/src/components/painel/cartao-resumo.tsx` — cartão de métrica (título, valor, ícone, rodapé).

## 1. `painel/layout.tsx` (server component que renderiza client)

Estrutura: componente de servidor que renderiza `<LayoutDoPainel>{children}</LayoutDoPainel>`; o `LayoutDoPainel` é `'use client'` definido no MESMO arquivo. Comportamento do client:
- Sem token (`possuiSessao()`) → `useEffect` redireciona `/login`.
- Com token: busca `buscarContaAtual()` p/ nome do usuário; erros 401/403 → limpa sessão e vai p/ `/login`.
- Layout: sidebar fixa à esquerda (w-64, `bg-card border-r`): logo, nav com `NavLink` ativo por `usePathname()` — itens: Dashboard (`LayoutDashboard`, `/painel`), Meu treino (`Dumbbell`, `/painel/treino`), Minha dieta (`Salad`, `/painel/dieta`), Meu perfil (`UserRound`, `/painel/perfil`); rodapé com nome do usuário e botão Sair (`LogOut`) → `encerrarSessao()` + `/login`. Área principal `flex-1 p-6 lg:p-10` com header mobile simples (título). Conteúdo com `motion.div` de entrada.

## 2. Dashboard (`/painel`)

Busca `buscarPlanoAtual()` + `listarEvolucao()` em paralelo (skeleton enquanto carrega; erro 404 → `/onboarding`). Conteúdo:
- Saudação: "Olá, {primeiro nome}! 👋" + frase por objetivo (ex.: emagrecimento: "Você está em déficit de 20% — consistência vence intensidade.").
- Grade de 4 `CartaoResumo`: Peso atual (kg + delta vs primeira pesagem), IMC (+ classificação), Meta calórica (kcal/dia), Água (ml/dia). Ícones: `Weight`, `Gauge`, `Flame`, `Droplets`.
- `GraficoEvolucaoPeso` (evolução) e `GraficoMacros` (pizza macros do dia, da `dieta.meta`) lado a lado.
- Cartões rápidos: "Próximo treino" (nome do plano + primeiro dia + duração, link p/ `/painel/treino`) e "Resumo da dieta" (kcal, proteína, carbo, gordura com `BarraDeProgresso` por macro vs meta, link p/ `/painel/dieta`).

`CartaoResumo` (component 9): `{titulo, valor, unidade?, icone: ReactNode, rodape?, corDoIcone?}` — ícone em quadrado `bg-secondary text-primary` rounded, valor `font-display text-3xl font-bold`.

`GraficoEvolucaoPeso` (component 7): props `{registros: RegistroEvolucao[]}`. recharts `ResponsiveContainer` + `LineChart` + `CartesianGrid strokeDasharray="3 3"` + `XAxis dataKey="data" tickFormatter={formatarData}` + `YAxis domain={['auto','auto']}` + `Tooltip` + `Line type="monotone" dataKey="peso_kg" stroke={CORES_DO_GRAFICO.peso} strokeWidth={3} dot={{r:4}}`. `dados` = `registros.map(r => ({data: r.data, peso: r.peso_kg}))`. Estado vazio: mensagem amigável com link para `/painel/perfil` ("Registre sua primeira pesagem").

`GraficoMacros` (component 8): props `{meta: MetaDaDieta}`. `PieChart` + `Pie data={[ {nome:'Proteínas', valor: meta.proteinas_g}, ... ]}` dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={85} paddingAngle={4} + `Cell` fill com `CORES_DOS_MACROS[i]` + `Legend` + `Tooltip`. Central label com kcal (usar `text` absoluto por cima).

## 3. Treino (`/painel/treino`)

Busca `buscarPlanoAtual()` (skeleton/erro 404 → onboarding). Cabeçalho: nome do plano, `Selo` com objetivo e versão, duração estimada. `Abas valorPadrao="0"` com um `GatilhoDeAba` por dia (rótulo "Dia 1" etc.). Cada `ConteudoDeAba`: título do dia + lista de exercícios em `Cartao` por exercício:
- Nome + `Selo` do grupo muscular.
- Campos editáveis em grade: Séries (number 1..10), Repetições (number 1..50), Carga kg (number, step 0.5, exibir "Peso corporal" quando `carga_sugerida_kg === null` com toggle para definir carga).
- Ao alterar qualquer campo → salvar automaticamente (onBlur ou botão "Salvar alterações" com ícone `Save`) via `editarExercicio(treino.id, {dia_indice, exercicio_indice, ...})` e atualizar estado local com resposta; feedback de sucesso (texto verde "Salvo ✓" temporário) e erro em vermelho.
- Rodapé do exercício: descanso (`Timer` icon, "Descanso: 90s") e dica (`Lightbulb`).

## 4. Dieta (`/painel/dieta`)

Busca `buscarPlanoAtual()`. Topo: cartão resumo — meta kcal, água (`Droplets`), fibras (`Wheat`), e `BarraDeProgresso` de cada macro (proteínas/carboidratos/gorduras: `totais` vs `meta`). Depois, por refeição (`dieta.refeicoes`): `Cartao` com cabeçalho (tipo + horário `Clock` + kcal `totais.calorias`/`calorias_alvo`). Cada item em linha: nome (com `Selo` "substituído" se `alternativa_usada`), quantidade (`quantidade` + unidade), kcal + macros (P/C/G abreviados). Substituição: `MenuDeSelecao` com placeholder "Trocar por..." e `<option>` para cada `item.alternativas` (value = nome) → ao mudar chama `substituirAlimento(dieta.id, {refeicao_indice, item_indice, alternativa_nome})` → atualiza estado com resposta. Dicas do objetivo no rodapé (lista com `Lightbulb`).

## 6. Perfil (`/painel/perfil`)

Busca `buscarPlanoAtual()` + `listarEvolucao()`. Seções:
- **Meus dados** (Cartao): lista sexo, faixa etária (`perfil.faixa_etaria`), altura, peso, objetivo (`rotuloDoObjetivo`), modalidade (`rotuloDaModalidade`), dias (`rotuloDoDia`). Selo do IMC com classificação.
- **Registrar pesagem** (Cartao): input peso (step 0.1) + input data (type date, valor padrão hoje) + botão "Registrar pesagem" → `registrarPesagem(peso, data)` → recarrega `listarEvolucao()`. Lista das últimas pesagens (data + peso + `TrendingDown/Up` comparado à anterior).
- **Renovar plano** (Cartao, destaque `gradiente-marca` ou borda primary): texto persuasivo "Sua evolução pede um plano novo?" + botão "Recalcular meu plano" (`RefreshCw`) → confirmação (confirm simples ou estado) → `recalcularPlanos()` → atualiza estados com os novos planos + mensagem de sucesso "Plano renovado! Versão X".
- **Sair da conta** opcional: botão `encerrarSessao()` + redirect `/login`.

## Regras gerais de qualidade

- Todos os componentes client com hooks precisam de `'use client'` na primeira linha.
- Erros: `try/catch`, mensagem em texto `text-destructive` ou cartão de erro com botão "Tentar novamente".
- Estados de carregamento com `Esqueleto`.
- `key` correta em todas as listas.
- Não usar `any`; tipos importados de `@/lib/tipos`.
- Nomes de variáveis/estados em português (ex.: `const [carregando, definirCarregando] = useState(true)`).

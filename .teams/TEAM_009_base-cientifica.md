# TEAM_009 — Base científica: treinos, dietas, dicas e README

**Data:** sessão da TEAM_009
**Autor do commit:** leostella97 <leonstella97@gmail.com>

## Pedido do usuário

> Incorporar a literatura de treinamento/nutrição (Schoenfeld, Fleck & Kraemer,
> Thibaudeau, Bompa & Buzzichelli, Zatsiorsky & Kraemer, Morton 2018,
> Wilson 2012, Sabag 2018, Achten & Jeukendrup, Kraemer & Ratamess 2005 e
> outras confiáveis), gerar mais treinos e dietas, melhorar os existentes e
> as dicas, e reescrever o README em tom mais humano citando TODAS as
> referências usadas.

## O que foi feito

### 1. Motor — `prescricao_fixa` (campo novo, opt-in)

`ModeloExercicio` ganhou `prescricao_fixa?: boolean`
(`apps/api/src/tipos.ts`, `apps/web/src/lib/motor/tipos-modelos.ts`).

Em `montarDia()` dos DOIS motores
(`apps/api/src/motor/montadorPlano.ts`, `apps/web/src/lib/motor/montadorPlano.ts`):

```ts
const mantemPrescricao = exercicio.grupo === 'cardio' || exercicio.prescricao_fixa === true;
```

**Por quê:** `REGRAS_POR_OBJETIVO` achata todo exercício de força na faixa do
objetivo (ex.: hipertrofia → 4×8–12). Isso serve aos modelos padrão, mas um
estilo periodizado (DUP: dia 4–6 reps / dia 8–12 / dia 12–20) deixaria de ser
ele mesmo. A flag preserva a prescrição do modelo — a carga sugerida continua
sendo calculada normalmente. Paridade API/web verificada por diff (idêntica).

### 2. Dicas por objetivo reescritas (5 de treino + 5 de nutrição × 3 objetivos)

Idênticas nos dois motores (verificado por `diff`). Conteúdo ancorado em:

- proximidade da falha sem perda técnica (Schoenfeld 2010);
- dose-resposta de volume semanal (Schoenfeld et al. 2017);
- descanso longo em compostos (Schoenfeld et al. 2016);
- interferência do treino concorrente e separação de sessões
  (Wilson et al. 2012; Sabag et al. 2018);
- proteína ~1,6–2,2 g/kg/dia e ~0,4 g/kg/refeição (Morton et al. 2018;
  Schoenfeld & Aragon 2018; Jäger et al. 2017);
- "fuel for the work required" — carbo ajustado ao dia (Achten & Jeukendrup).

Sem promessas falsas: nada de "descanso curto derrete gordura" ou cardio
obrigatório para emagrecer.

### 3. Oito modelos de treino novos (todos com `prescricao_fixa`)

| Arquivo | Método |
| --- | --- |
| `academia/hipertrofia/3dias-ondulante.json` | DUP: força 4–6 / hipertrofia 8–12 / metabólico 12–20 + HIIT finisher |
| `academia/hipertrofia/4dias-ondulante.json` | DUP 4 dias (upper/lower ondulante) |
| `academia/emagrecimento/4dias-mrt.json` | Metabolic resistance training — circuitos de compostos, descanso curto |
| `academia/emagrecimento/5dias-hiit-forca.json` | Força + HIIT em sessões separadas (mitiga interferência — Wilson 2012) |
| `academia/corrida/3dias-forca-corredor.json` | Força pesada + pliometria, economia de corrida (Blagrove 2018; Rønnestad & Mujika 2014) |
| `pesocorporal/hipertrofia/4dias-tensao-progressiva.json` | Calistenia por progressão de alavanca/tempo sob tensão |
| `pesocorporal/corrida/3dias-forca-corredor.json` | Força do corredor sem equipamento |
| `pesocorporal/emagrecimento/3dias-mrt.json` | MRT calistênico |

### 4. Cinco dietas novas pareadas por slug

A seleção já suportava `dietas/{objetivo}-{slug}.json`; criados:

- `hipertrofia-ondulante.json` — proteína distribuída ~0,4 g/kg/refeição;
  carbo maior em torno do treino pesado;
- `emagrecimento-mrt.json` — déficit com proteína alta e densidade
  nutricional/volume para saciedade;
- `emagrecimento-hiit-forca.json` — carbo fácil no pré, jantar baixo-carbo;
- `corrida-forca-corredor.json` — "combustível para o trabalho": carbo
  concentrado em pré/pós, recuperação carbo+proteína;
- `hipertrofia-tensao-progressiva.json` — comida de verdade (ovos, leite,
  arroz, feijão, batata) com a mesma lógica de distribuição.

**Correção durante o trabalho:** a ceia do MRT tinha chá (1 kcal/100 ml) com
30% das calorias da refeição → ~4 L de chá pela fórmula de gramas. Trocado por
cottage + castanhas (densidades reais).

### 5. Validador reforçado (`scripts/validar-modelos.mjs`)

Novas regras: `prescricao_fixa` deve ser booleano; `distancia_km` deve ser
número em (0, 500] e só é permitido no grupo `cardio`. Cabeçalho atualizado.

### 6. `apps/api/modelos/LEIA-ME.md` atualizado

Documentados: `prescricao_fixa`, `distancia_km`, semântica do grupo cardio
(1 série = minutos; várias = segundos por tiro), variações nomeadas e dietas
pareadas por slug, e o passo `node scripts/validar-modelos.mjs` no fluxo de
adição de modelo.

### 7. README reescrito

- Tom humano ("o que o app faz e o que não promete");
- Números corrigidos: **208 treinos** (36 padrão + 172 variações) e
  **158 dietas** (antes dizia "36 + 14" e "50 modelos");
- Tabela de endpoints corrigida: removido `GET /perfil` (inexistente desde a
  TEAM_007); adicionados `PATCH /perfil/corpo`, `PATCH /perfil/treino`,
  `GET/POST /api/checkin` e alternativas em lote;
- Seções novas: timer de descanso, checklist persistente, cardio por
  tempo/distância, `prescricao_fixa`, "O que a ciência sustenta (e o que ela
  não promete)";
- Seção **Referências** com 21 itens: 5 livros + meta-análises + artigos de
  fisiologia/nutrição + nota sobre as revisões da RBPFEX — incluindo fontes
  extras realmente usadas (Blagrove 2018, Rønnestad & Mujika 2014,
  Schoenfeld & Aragon 2018, Jäger et al. 2017, Rhea 2002, ACSM 2009,
  Mifflin 1990);
- Aviso honesto: nem toda recomendação sai de um único estudo.

### 8. Specs novas (`spec/montador-plano.spec.ts`, 4 casos)

- sem flag → regra do objetivo;
- `prescricao_fixa: true` → prescrição do modelo preservada;
- cardio sem flag → tempo/distância preservados (regressão TEAM_008);
- carga sugerida continua sendo calculada com `prescricao_fixa`.

## Verificação (tudo verde)

| Verificação | Resultado |
| --- | --- |
| `node scripts/validar-modelos.mjs` | 366 arquivos, 0 erros |
| `npm run typecheck` (api + web) | limpo |
| `npx tsc -p spec/tsconfig.json` | limpo |
| `npm test` (Jasmine) | 63 specs, 0 falhas |
| `npm run testar:local` | 92 verificações, 0 falhas |
| `npm run testar:motor` | 20 verificações — motor do navegador idêntico ao servidor |
| `build:pages` + PWA | 11 páginas, service worker e índice de modelos ok |

## Decisões e notas para equipes futuras

- **`prescricao_fixa` é opt-in de propósito** — modelos padrão continuam
  recebendo a regra do objetivo; só estilos periodizados devem usar a flag.
- **Itens de dieta precisam de densidade calórica real** — nada de item
  ~0 kcal/100 g com percentual alto (a fórmula de gramas explode).
- Os modelos novos são apenas conteúdo: **nenhuma rota mudou**, então o modo
  navegador e a API se comportam igual sem código extra.
- Itens de referência citados no README foram escolhidos por existirem de
  fato; evitar adicionar citações não verificadas.

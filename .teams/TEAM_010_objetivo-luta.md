# TEAM_010 — Novo objetivo: Luta

**Data:** sessão da TEAM_010
**Autor do commit:** leostella97 <leonstella97@gmail.com>

## Pedido do usuário

> inclua objetivo: luta, link informações para treino e dieta de luta,
> se necessário, crie novos

## Decisão de arquitetura

`luta` entrou como **objetivo** (não modalidade). Isso preserva o modelo de
onboarding existente — objetivo responde "qual a meta", modalidade responde
"onde/como treino" — e reaproveita toda a estrutura de pastas:

```text
treinos/{modalidade}/{objetivo}/{dias}dias.json
dietas/{objetivo}.json
dietas/{objetivo}-{slug}.json   (dieta pareada do estilo nomeado)
```

## Escolhas de cálculo (idênticas API/web)

| Parâmetro | Valor | Justificativa |
| :--- | :--- | :--- |
| `AJUSTE_POR_OBJETIVO` | `0` (manutenção) | Objetivo de performance; corte de peso rápido é território de supervisão profissional, não de app |
| `PROTEINA_G_POR_KG` | `1.8` | Faixa alta de Morton et al. 2018 (1,6–2,2 g/kg) para suportar treino de força + sessões técnicas |
| `GORDURA_PERCENTUAL` | `0.25` | Intermediária entre hipertrofia (0,20) e emagrecimento (0,30) |
| `AGUA_ML_POR_KG` | `40` | Mesma da corrida — demanda de sudorese alta (treino com proteção, rounds) |
| `REGRAS_POR_OBJETIVO` | `4 × 6–10 reps, 90 s` | Viés força-potência: faixa entre força máxima e hipertrofia |

## O que foi feito

### 1. Tipos e constantes (API + web, paridade verificada)

- `Objetivo` ganhou `'luta'` em `apps/api/src/tipos.ts` e
  `apps/web/src/lib/tipos.ts`.
- `OBJETIVOS` com rótulo "Luta" e descrição nos dois `constantes.ts`.
- `rotuloDoObjetivo`, ícone `Swords` (lucide) no onboarding e na landing,
  cartão de objetivo na landing (stat 3→4), `FRASES_POR_OBJETIVO` no painel.
- Comentário do campo `objetivo` em `banco.ts` atualizado.

### 2. Cálculos e dicas nos dois motores

- Quatro `Record<Objetivo, ...>` completados em `calculos.ts` (×2 arquivos).
- `REGRAS_POR_OBJETIVO` + 5 dicas de treino + 5 dicas de nutrição específicas
  de combate em `montadorPlano.ts` (×2 arquivos, conteúdo idêntico).
- Temas das dicas: força-potência como base, separação de sessões pesadas de
  condicionamento, não sacrificar prática técnica por fadiga, sono/recuperação;
  na dieta: proteína distribuída, carboidrato para sparring/intervalado,
  hidratação+eletrólitos, alerta explícito contra corte rápido de peso sem
  supervisão.

### 3. Modelos de treino — 12 padrão + 1 estilo nomeado

- `scripts/gerar-modelos-luta.mjs`: gerador determinístico que emite a matriz
  completa `academia/luta` e `pesocorporal/luta` (2–7 dias = 12 arquivos) no
  formato da casa (um exercício por linha, ordem canônica de campos).
- Conteúdo dos modelos: compostos pesados, pliometria/potência, trabalho de
  pegada (farmer's walk, barra fixa), core anti-rotação (Pallof, pranchas),
  condicionamento intervalado e mobilidade — splits progressivos por frequência.
- `academia/luta/4dias-mma.json`: estilo nomeado orientado a MMA
  (força inferior, força superior, potência/corpo inteiro, condicionamento).

### 4. Dietas — padrão + pareada

- `dietas/luta.json`: dieta de performance, manutenção calórica.
- `dietas/luta-mma.json`: pareada com o estilo MMA (slug `mma` do objetivo
  `luta` resolve pelo seletor existente `{objetivo}-{slug}.json`).

### 5. Scripts, validador e docs

- `validar-modelos.mjs`: matriz agora 2 modalidades × 4 objetivos × 6 dias =
  **48 modelos padrão**.
- `copiar-modelos.mjs`: `OBJETIVOS` inclui `luta` (senão o GitHub Pages não
  receberia os arquivos).
- `teste-da-matriz.ps1`: 48 combinações; `teste-dos-dados-possiveis.ps1`:
  272 perfis (2×17×4×2) + 8 limites = 280.
- `README.md`: 4 objetivos, 221 treinos/160 dietas, seção de luta com
  avisos de segurança (sem corte rápido sem supervisão, app não substitui
  técnico nem nutricionista) e novas referências de esportes de combate.
- `apps/api/modelos/LEIA-ME.md` e `docs/ESPECIFICACAO-DO-FRONTEND.md`
  atualizados.

## Verificação (tudo verde)

| Checagem | Resultado |
| :--- | :--- |
| `validar-modelos.mjs` | **381 arquivos, 0 erros** (matriz completa) |
| `typecheck` (api + web) | limpo |
| `tsc -p spec` | limpo |
| Jasmine (`npm test`) | **65 specs, 0 falhas** |
| `testar:local` | 92/92 |
| `testar:motor` | 20/20 (paridade navegador ↔ servidor) |
| `teste-da-matriz.ps1` | **48/48 combinações** |
| `teste-dos-dados-possiveis.ps1` | **280/280 perfis** |
| `build:pages` + PWA | ok, `luta` copiado e indexado |
| E2E manual | `luta` + `mma` → `treinos/academia/luta` + `dietas/luta-mma.json`; 140 g proteína e 3.120 ml água p/ 78 kg ✓ |

## Notas de segurança

- Nenhum texto sugere corte de peso rápido ou desidratação — o objetivo usa
  manutenção calórica e as dicas alertam que ajustes de categoria exigem
  supervisão profissional.
- Os modelos priorizam qualidade técnica e recuperação sobre volume de fadiga.

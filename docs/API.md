# Referência da API — ProtocolFit

Backend Fastify (`apps/api`). Todas as respostas são JSON. Erros seguem sempre o
envelope `{ "mensagem": "..." }`.

**Base URL (desenvolvimento):** `http://localhost:3333/api`

## Autenticação

Rotas protegidas exigem `Authorization: Bearer <token>` (JWT HS256, validade de
7 dias). Token inválido/ausente/expirado → `401 { mensagem: "Sessão expirada
ou inválida. Entre novamente." }`.

| Proteção | Detalhe |
| :--- | :--- |
| Rate limit | `POST /api/auth/*` — 30 req/min por IP (resposta `429`) |
| Bloqueio de conta | 3 senhas erradas → 5 h bloqueada (`423`) |
| Anti-enumeração | Login sem conta gasta ~o mesmo tempo do bcrypt (resposta genérica) |
| Headers de segurança | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cache-Control: no-store` em toda resposta |
| Validação de tipos | campos com tipo errado → `400` (nunca `500`) |

## Endpoints

### `GET /api/saude` — público

Status do serviço.

```json
{ "status": "ok", "sistema": "ProtocolFit", "timestamp": "..." }
```

### `GET /api/opcoes` — público

Todas as opções estáticas do onboarding: `faixas_etarias`, `objetivos`
(emagrecimento | hipertrofia | corrida | luta), `modalidades`,
`frequencias_semanais`, `dias_semana`, `variacoes_de_treino` (estilos lidos
dos modelos mestres, em cache no servidor).

### `POST /api/auth/cadastro` — público, rate-limited

```json
{ "nome": "Maria Silva", "email": "maria@ex.com", "senha": "min. 8 chars" }
```

→ `201 { token, usuario: { id, nome, email, criado_em } }` · `400` validação · `409` e-mail já cadastrado.

### `POST /api/auth/login` — público, rate-limited

```json
{ "email": "maria@ex.com", "senha": "..." }
```

→ `200 { token, usuario }` · `401` credenciais inválidas · `423` bloqueada.

### `GET /api/eu` — autenticada

Sessão atual + estado do onboarding.

→ `200 { usuario, perfil | null, possui_planos }` · `404` usuário inexistente.

### `POST /api/perfil` — autenticada (onboarding)

```json
{
  "sexo": "masculino|feminino",
  "faixa_etaria": "27-31",
  "peso_kg": 78.5,
  "altura_cm": 175,
  "objetivo": "emagrecimento|hipertrofia|corrida|luta",
  "frequencia_semanal": 4,
  "dias_disponiveis": ["segunda", "quinta"],
  "modalidade": "academia|pesocorporal",
  "nivel": "iniciante|intermediario|avancado",
  "variacao_treino": "slug-do-estilo | null | \"padrao\""
}
```

Grava o perfil e gera os planos **numa transação**. → `201 { perfil, treino, dieta }` · `400` campo inválido (inclui dias repetidos/inválidos e estilo inexistente).

### `PATCH /api/perfil/corpo` — autenticada

```json
{ "peso_kg": 79.0, "altura_cm": 176, "data": "AAAA-MM-DD (opcional, dia civil do cliente)" }
```

Atualiza só peso/altura — **não** regenera os planos. `data` permite gravar a
pesagem no dia civil do cliente. → `200 { perfil }` · `404` sem perfil.

### `PATCH /api/perfil/treino` — autenticada

```json
{ "variacao_treino": "forca-maxima" }
```

Troca o estilo de treino e regenera os planos (transação). `"padrao"`/`null`
volta ao clássico. → `200 { perfil, treino, dieta }` · `400` estilo inválido · `404` sem perfil.

### `POST /api/perfil/recalcular` — autenticada

Sem corpo. Usa a **última pesagem da evolução** como peso atual e regenera os
planos (transação). → `200 { perfil, treino, dieta }` · `404` sem perfil.

### `GET /api/plano/atual` — autenticada

Plano vigente completo. → `200 { perfil, treino, dieta }` (com `id`, `versao`,
`modelo_origem`, `criado_em`) · `404` sem perfil/planos.

### `PATCH /api/plano/treino/:planoId` — autenticada

Edita um exercício **na cópia do usuário** (os mestres JSON nunca mudam).

```json
{ "dia_indice": 0, "exercicio_indice": 2, "series": 4, "repeticoes": 10, "carga_kg": 40.5, "distancia_km": 1.2 }
```

Limites: séries 1–10 · repetições 1–50 (cardio: 1–600 = tempo) · carga 0–400 kg ·
distância >0–500 km. → `200` treino atualizado · `400` índice/campo inválido · `403` plano alheio.

### `GET /api/plano/treino/:planoId/alternativas?dia_indice=N` — autenticada

Alternativas de **todos** os exercícios do dia numa única chamada (mesmo
**músculo-alvo** dentro do grupo, mesma modalidade, exclui os que já estão no
dia — com fallback para o grupo inteiro quando o músculo não tem outra opção).
Cada alternativa traz `nome`, `tipo` e `mesmo_musculo` (false só no fallback).
→ `200 { alternativasPorExercicio }` · `403`/`404`.

### `PATCH /api/plano/treino/:planoId/trocar` — autenticada

```json
{ "dia_indice": 0, "exercicio_indice": 2, "exercicio_nome": "Supino inclinado com halteres" }
```

Troca por alternativa do mesmo grupo **e mesmo músculo** quando o catálogo
oferece opção do mesmo músculo (carga recalculada pelo peso do perfil).
→ `200` treino atualizado · `400` grupo diferente/nome inválido · `403`.

### `PATCH /api/plano/dieta/:planoId/substituir` — autenticada

```json
{ "refeicao_indice": 0, "item_indice": 1, "alternativa_nome": "Peito de frango" }
```

Substitui o alimento e recalcula a porção em gramas. → `200` dieta atualizada · `400`/`403`.

### `POST /api/evolucao` — autenticada

```json
{ "peso_kg": 79.5, "data": "AAAA-MM-DD (opcional)" }
```

Registra a pesagem do dia (uma por data — repetir atualiza) e sincroniza o peso
do perfil. Rejeita data futura. → `201 { id, data, peso_kg }`.

### `GET /api/evolucao` — autenticada

→ `200 [{ id, data, peso_kg }, ...]` crescente — alimenta o gráfico do painel.

### `GET /api/checkin?hoje=AAAA-MM-DD` — autenticada

`hoje` = dia civil **do cliente** (fuso) — sem ele cai no UTC do servidor.

→ `200 { hoje, registros (últimos 60), sequencia_atual, sequencia_maxima, total, dias_cumpridos (últimos 30) }`.

### `POST /api/checkin` — autenticada

```json
{
  "data": "AAAA-MM-DD (opcional — check-in retroativo)",
  "hoje": "AAAA-MM-DD (opcional — referência da sequência)",
  "treino_feito": true,
  "dieta_seguida": true,
  "agua_ml": 2500,
  "peso_kg": 79.5,
  "observacao": "texto até 1000 chars"
}
```

Upsert por dia; campos omitidos preservam o já gravado; `peso_kg` também entra
na evolução (transação). Rejeita data futura. → `201 { checkin, ...resumo }`.

## Convenções

- **Isolamento por usuário**: todo recurso é filtrado por `usuario_id` do JWT —
  acessar plano/check-in alheio → `403`.
- **Transações**: operações multi-escrita (gerar planos, recalcular, trocar
  estilo, check-in com pesagem) são atômicas.
- **Datas civis**: `AAAA-MM-DD`; o cliente informa `hoje`/`data` no próprio fuso.
- **Tipos estritos**: `boolean`, `number`, `string` errados → `400`.

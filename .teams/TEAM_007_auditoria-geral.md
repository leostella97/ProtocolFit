# TEAM_007 — Auditoria geral: erros, redundâncias, desempenho e testes Jasmine

## Missão
Pedido do usuário: "analise o projeto, verifique se há erros, redundâncias,
códigos não utilizados, procure melhorar o desempenho e velocidade; instalei
jasmine js pode usar".

Auditoria completa (backend Fastify + frontend Next.js + espelho local do
navegador) com correções de correção, desempenho, segurança e paridade de
comportamento entre os dois modos (servidor/SQLite e navegador/localStorage).

## Erros corrigidos

### API
- `POST /checkin` ignorava o "hoje" civil do cliente: a sequência do resumo era
  calculada pela data do servidor — quebrava o dia para fusos adiante/atrás.
  Corpo agora aceita `data` (dia do registro) **e** `hoje` (referência do
  resumo), ambos validados (formato + não futuro).
- Edição de exercício aceitava valores que burlavam a validação (tipos não
  numéricos, índices não inteiros); endurecida.
- Check-in/evolução aceitavam datas futuras e tipos coagidos (`"true"`,
  `"2"`), peso fora dos limites corporais e observação ilimitada — tudo com
  validação estrita (tipo, faixa e tamanho máximo).
- Escritas multi-etapas sem transação: uma falha entre desativar plano antigo
  e inserir o novo deixava o usuário sem plano ativo. `gerarPlanos`,
  `salvarPerfil`, troca de estilo, recálculo e check-in agora usam
  `executarEmTransacao` (novo helper em `bd/banco.ts`).
- `POST /evolucao` relia a linha inserida; resposta passa a vir da inserção.
- `GET /perfil` morto removido (Regra 6); dias duplicados no perfil rejeitados;
  slug de variação de treino validado contra os modelos do disco.
- `listarCheckins` sem limite devolvia só parte do histórico; agora sem limite
  devolve tudo (o limite opcional segue para quem pedir).

### Frontend
- `cartao-checkin`: meta de água usava 35 ml/kg fixo — para objetivo `corrida`
  o correto é 40. Usa `AGUA_ML_POR_KG[perfil.objetivo]` do motor.
- Onboarding validava peso/altura com limites locais (30–350 kg, 100–250 cm)
  divergentes dos oficiais (30–300, 100–230 em `LIMITES_CORPO`); chip de
  "frequência semanal" era decorativo e podia divergir dos dias marcados —
  campo removido, envia `diasSelecionados.length`.
- `repositorio-local.ts` divergia da API (coerção permissiva, sem rejeição de
  data futura, sem suporte a `hoje` separado, atualização de check-in
  apagava campos omitidos). Agora espelha as mesmas regras.
- Termo de uso dizia "não possui servidor nem banco de dados" — falso no modo
  API. Texto tornou-se mode-aware e a versão do termo subiu para 2.
- Checklist da dieta acumulava chaves antigas no localStorage — poda adicionada.

## Desempenho
- **Cache de variações de treino** (`carregadorModelos.ts` da API): a rota
  pública de opções varria ~190 JSONs a cada chamada; agora cacheia os
  metadados varridos.
- **N+1 de alternativas eliminado**: a página de treino fazia uma requisição
  por exercício; nova rota `GET /plano/treino/:planoId/alternativas?dia_indice=N`
  devolve todas do dia de uma vez (`alternativasPorExercicio`), e a página
  pré-busca os dias em paralelo.
- **Filtro de estilos duplicado** (`estilosDaCombinacao` em onboarding e
  perfil) virou `variacoesDaCombinacao` pura em `util.ts` — fonte única,
  testável no Jasmine.

## Segurança
- Produção exige `JWT_SECRET` configurado — removido fallback de desenvolvimento.
- `@fastify/rate-limit` registrado no escopo `/api/auth` + `trustProxy`.
- Login faz `bcrypt.compare` contra hash de referência quando o e-mail não
  existe (equaliza tempo de resposta entre "e-mail inexistente" e "senha errada").
- Error handler uniforme em `servidor.ts`.
- Guards de propriedade (plano/check-in pertencem ao usuário) revisados.

## Código morto removido (Regra 6)
- `formatarMoeda` (só a spec a usava), `CartaoAcao`, `GET /perfil`,
  `variacoesDaCombinacao` duplicada, fallback `?? 1.375` no TMB,
  exports internos do carregador/cálculos que não eram usados fora.

## Testes
- Jasmine (já instalado pelo usuário na raiz): `npm test` → **44 specs, 0 falhas**
  em `spec/util.spec.ts`, `spec/checkin-util.spec.ts`, `spec/motor-navegador.spec.ts`
  e `spec/sequencia-checkins.spec.ts` (regressão de sequência/cap/referência).

## Verificação (tudo verde)
| Teste | Resultado |
| :--- | :--- |
| `typecheck` api + web | limpo |
| `npm test` (Jasmine) | 44 specs, 0 falhas |
| `testar:local` | 92 verificações, 0 falhas |
| `testar:motor` | 20 verificações, 0 falhas |
| `teste-de-checkin-e-corpo.ps1` | 17 verificações, 0 falhas |
| `teste-da-api.ps1` (E2E) | ok (opções→perfil→planos→variação→isolamento→lockout) |
| `teste-da-matriz.ps1` | **36 combinações, 0 falhas** |
| `teste-dos-dados-possiveis.ps1` | 212 perfis, 0 falhas |
| `build:pages` + validador PWA | 11 páginas estáticas ok |

### Correção do teste da matriz
O script marcava as 36 combinações como falha porque comparava
`dieta.modelo_origem` com `dietas/{objetivo}` — formato antigo. Desde o commit
`f8f6f53` a origem inclui o arquivo (`dietas/{objetivo}.json`); o teste foi
atualizado para o contrato atual. Não era bug da API.

## Notas de transferência
- Contrato novo do check-in: `{ data, hoje?, ...campos }` — `data` é o dia
  registrado, `hoje` é a referência civil do resumo (frontend manda
  `hojeLocal()`).
- Alternativas por dia: `GET .../alternativas?dia_indice=N` →
  `{ alternativasPorExercicio: Alternativa[][] }` (alinhado à ordem dos
  exercícios do dia).
- `executarEmTransacao(fn)` em `bd/banco.ts` é o padrão para escritas
  multi-etapas.
- `util/datas.ts` (API) concentra `dataValida`, `dataNoFuturo`, `hojeEmTexto`,
  `diaCumprido` — usar sempre para datas civis.
- `MSYS_NO_PATHCONV=1` segue necessário para `build:pages` no Git Bash.
- Jasmine roda `.ts` via `tsx` (`npm test` na raiz); seed randomizado.

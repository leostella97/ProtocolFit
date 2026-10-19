# TEAM_013 — Troca de estilo de treino direto na página de treino

**Data:** sessão atual · **Autor:** leostella97

## Pedido

> "incluir trocar estilo de treino"

## Diagnóstico

A troca de estilo já existia — `atualizarEstiloDeTreino` (API + modo local),
`PATCH /perfil/treino` e o seletor na página de **perfil** — mas a página de
**treino**, onde o usuário efetivamente usa o plano, não mostrava nem o
estilo vigente nem oferecia a troca. O usuário precisava sair do treino e
achar a opção no perfil.

## Implementação (só UI — o motor e os fluxos já existiam)

`apps/web/src/app/painel/treino/page.tsx`:

- `buscarOpcoes()` entra no `Promise.all` do carregamento (falha dela não
  derruba a página — o seletor simplesmente some).
- `estilosDisponiveis = variacoesDaCombinacao(...)` — mesma regra do perfil
  (modalidade + objetivo + nº de dias do usuário).
- Seletor "Estilo de treino" no cabeçalho, visível só quando há mais de um
  estilo para a combinação; valor atual = `perfil.variacao_treino ?? 'padrao'`.
- `trocarEstiloDeTreino(id)`: chama `atualizarEstiloDeTreino` ("padrao" →
  `null`), **zera o checklist de cada dia do plano novo** (`gravarConcluidos`
  com `[]` — estilo novo significa exercícios diferentes nas mesmas
  posições), limpa `alternativasPorDia` e rebusca as alternativas de todos
  os dias do plano regenerado.
- Erros ficam numa mensagem própria sob o seletor (`erroEstilo`).

## Verificação

- typecheck web: limpo
- `testar:local`: 95/95 — `atualizarEstiloDeTreinoLocal` já era coberto
  (crossfit → nome do modelo, voltar ao padrão → `variacao_treino: null`)
- `build:pages` + PWA: ok

## Notas

- A troca recria o plano mantendo o padrão do sistema (modelo mestre
  intacto — só a cópia do usuário é regenerada).
- O checklist é zerado porque as marcas são por índice do slot e o estilo
  novo traz exercícios diferentes.

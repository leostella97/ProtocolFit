# TEAM_014 — Troca de objetivo direto na página de treino

**Data:** sessão atual · **Autor:** leostella97

## Pedido

> "como mudo treino de hipertrofia, emagrecimento, corrida, luta? é essa a
> minha solicitação."

O usuário queria trocar o **objetivo** (não o estilo — essa era a TEAM_013).

## Diagnóstico

Trocar o objetivo já era possível, mas escondido: página de **perfil** →
"Meus dados" → **Editar** → campo "Objetivo" → Salvar (regenera treino e
dieta via `salvarPerfilEGerarPlanos`). Na página de treino, onde o usuário
está olhando o plano, não havia como trocar.

## Implementação (só UI — fluxo já existia)

`apps/web/src/app/painel/treino/page.tsx`:

- Seletor **"Objetivo"** ao lado do "Estilo de treino" no cabeçalho
  (aparece quando `opcoes` carrega — `opcoes.objetivos` traz os 4 rótulos).
- `trocarObjetivo(novoObjetivo)`: monta `CorpoPerfil` com os dados atuais
  do perfil (peso vem do histórico — mesma regra do perfil) e chama
  `salvarPerfilEGerarPlanos`. Se o `variacao_treino` atual não existe na
  nova combinação (modalidade+objetivo+dias), volta ao clássico (`null`) —
  mesma regra da edição do perfil.
- `aplicarPlanoRegenerado(resultado)`: pós-condição compartilhada entre
  troca de objetivo e de estilo — zera o checklist de cada dia, limpa e
  rebusca as alternativas de troca de exercício.
- `trocandoEstilo` cobre as duas trocas (o seletor desabilita durante).

## Como o usuário troca agora

1. Painel → **Treino**: seletor "Objetivo" no topo (hipertrofia,
   emagrecimento, corrida, luta) — troca na hora, plano regenerado.
2. Alternativa (já existia): **Perfil** → Editar → Objetivo → Salvar.

## Verificação

- typecheck web: limpo · `build:pages` + PWA: ok
- `salvarPerfilEGerarPlanosLocal` coberto por `testar:local` (95/95)

## Notas

- Trocar o objetivo regenera treino E dieta (novas calorias/macros/dicas
  do objetivo novo); a versão do plano sobe.
- O estilo é resetado para o clássico quando não existe na nova combinação
  (ex.: estava "CrossFit" de hipertrofia → troca para corrida).

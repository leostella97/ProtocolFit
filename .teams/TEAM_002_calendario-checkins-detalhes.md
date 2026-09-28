# TEAM_002 — Calendário de check-ins interativo (detalhes do dia)

## Missão
- **Detalhes do dia no calendário**: os dias COM check-in (cumprido ou
  registrado sem treino/dieta) passam a ser clicáveis no `CalendarioDeCheckins`.
  Ao tocar num dia, abre-se um painel logo abaixo da grade com: data por
  extenso, treino feito, dieta seguida, água bebida (ml), peso do dia (quando
  informado) e observação livre.
- **Sem Devin como contribuinte**: commits desta equipe NÃO carregam trailer
  "Generated with Devin" nem `Co-Authored-By` — reforçado pela config do
  usuário `%APPDATA%\devin\config.json` com `"attribution": false`.
  Autor dos commits permanece `leostella97` apenas.

## Decisões de design
- Dias **sem check-in** e **futuros** continuam inertes (`<span>`) — só dias
  com registro viram `<button>` (mesma aparência + `cursor-pointer` e leve
  zoom no hover).
- O dia selecionado ganha anel `ring-foreground` (diferente do anel
  `ring-primary` do dia de hoje); tocar de novo no mesmo dia fecha o painel.
- Trocar de mês limpa a seleção — o painel nunca mostra data de outro mês.
- Os detalhes vêm direto de `resumo.registros` (mesma fonte que já alimenta a
  grade): mapa `data → CheckinDiario` em `useMemo`. Janela = últimos 60 dias,
  a mesma navegável no calendário.
- Peso aparece só quando `peso_kg !== null`; observação só quando preenchida.

## Pontos tocados
- `apps/web/src/components/painel/calendario-checkins.tsx` — dias clicáveis,
  painel de detalhes do dia, dica de uso na legenda.
- `%APPDATA%\devin\config.json` — `"attribution": false` (config do USUÁRIO,
  fora do repositório).
- `.teams/TEAM_002_calendario-checkins-detalhes.md` — este arquivo.

## Estado
- [x] Testes de base passando antes da alteração (83/83)
- [x] Implementação
- [x] Testes + typecheck + build:pages verdes depois (83/83, tsc limpo, build ok, PWA ok)
- [x] Commit sem co-autor de ferramenta (apenas `leostella97` — 88553d1)

## Notas de transferência
- `CheckinDiario` completo (id, data, treino_feito, dieta_seguida, agua_ml,
  peso_kg, observacao) está em `apps/web/src/lib/tipos.ts`.
- Se um dia a edição retroativa de check-in for pedida, o ponto natural é o
  painel de detalhes (já tem o registro na mão).

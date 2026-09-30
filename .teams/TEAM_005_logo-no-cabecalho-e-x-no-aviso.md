# TEAM_005 — Logo no lugar da seta de voltar + X no aviso "modo demonstração"

## Missão
Três pedidos do usuário:
1. **Contribuidores no GitHub**: só o nome dele deve aparecer — nada de bot
   como contribuinte. (Constatado: o contribuinte extra NÃO é "Devin" — é
   `google-labs-jules[bot]`, autor de 4 commits mergeados via PRs #1–#4.)
2. **Logo no lugar da seta de voltar** no painel.
3. **X para fechar** o aviso "Modo demonstração no seu navegador".

## Sincronização prévia
- `git pull --ff-only`: a main local estava 8 commits atrás do GitHub
  (PRs #1–#4 do jules: 150 dietas, ~150 treinos, timer de descanso e
  checklist de refeições). Nenhum commit local pendente — merge limpo.
- Base de testes ANTES das alterações: `testar:local` 92/92 verde.

## Pedido 1 — contribuinte (PENDENTE de aprovação do usuário)
Fatos levantados:
- Todos os commits do histórico local+remoto já saem como `leostella97`
  (autor e committer); nenhum trailer "Generated with Devin" nem
  `Co-Authored-By` — `%APPDATA%\devin\config.json` segue com
  `"attribution": false`.
- A lista de contribuidores do GitHub mostra `leostella97` (35) e
  `google-labs-jules[bot]` (4) — os 4 commits do bot vêm dos PRs mergeados.
- O GitHub só tira alguém da lista de contribuidores se os commits deixarem
  de existir na branch padrão → exige REESCREVER o histórico (re-autorar os
  4 commits para `leostella97`) + `push --force-with-lease` na main.
- É operação destrutiva sobre histórico público → submetido ao usuário.
- **DECISÃO DO USUÁRIO: manter o histórico como está.** O jules continua na
  lista de contribuidores; os commits desta equipe saem só como
  `leostella97` (sem trailer/co-autor), como sempre.

## Pedido 2 — logo em vez da seta de voltar
- `apps/web/src/app/painel/layout.tsx`:
  - Removidos a seta do cabeçalho mobile e o botão "Voltar" do desktop,
    junto com `voltarPagina`, `naRaizDoPainel`, `usePathname` e o import de
    `ArrowLeft` (código morto eliminado, Regra 6).
  - O logo do cabeçalho mobile virou `Link → /painel` (assume o papel de
    "voltar ao início" que a seta tinha — mesmo papel do logo na barra
    lateral do desktop).
  - Desktop: navegação continua pela barra lateral (que já tem logo+link);
    nada substitui o botão "Voltar" para não duplicar o logo.
- NÃO mexido: o "Voltar" do onboarding (passo a passo do wizard — navegação
  interna de formulário, não seta de página) e as setas de mês do calendário.

## Pedido 3 — X no aviso do modo demonstração
- `apps/web/src/components/aviso-modo-local.tsx` virou client component:
  - Botão `X` (`Botao fantasma/icone`, size-6) fecha a faixa.
  - Preferência gravada em `localStorage` (`protocolfit_aviso_local_dispensado`)
    — o aviso não reaparece nas próximas visitas.
  - `useEfeitoAntesDaPintura` (useLayoutEffect no cliente / useEffect no SSR):
    quem já dispensou não vê nem um flash da faixa — sem CLS e sem aviso de
    SSR do React.
  - No modo servidor (MODO_LOCAL=false) continua não renderizando nada.

## Estado
- [x] Testes de base passando antes da alteração (92/92)
- [x] Implementação (pedidos 2 e 3)
- [x] Verificação: `typecheck` limpo (web+api) · `testar:local` 92/92 ·
      `build:pages` 12 páginas + PWA ok
- [x] Contribuinte no GitHub — usuário optou por NÃO reescrever o histórico
- [ ] Commit — somente `leostella97` (sem co-autor de ferramenta)

## Notas de transferência
- Se um dia quiser tirar o jules dos contribuidores: `git filter-branch
  --env-filter` re-autorando os 4 commits com e-mail
  `161369871+google-labs-jules[bot]@…` para `leostella97
  <leonstella97@gmail.com>`, depois `push --force-with-lease`. A lista do
  GitHub pode demorar a atualizar (cache); os PRs #1–#4 continuam existindo
  (o painel de contribuidores só conta commits da branch padrão).
- Chave nova de localStorage: `protocolfit_aviso_local_dispensado` ('1').

# TEAM_006 — Timer de descanso em todos os exercícios + contribuidor

## Missão
Dois pedidos do usuário:
1. **"Não quero Devin como contribuidor"** no GitHub.
2. **Timer em cada exercício do treino**, com 1, 2, 3 minutos ou tempo livre.

## Pedido 1 — contribuidor (verificado, sem alteração necessária)
- `git log` (local + remoto): autores são `leostella97`,
  `Leonardo Stella de Oliveira`, `GitHub <noreply>` (merges via web) e
  `google-labs-jules[bot]` (4 commits dos PRs #1–#4). **Devin não é
  contribuidor** — nenhum commit, trailer nem co-autor.
- `%APPDATA%\devin\config.json` segue com `"attribution": false`.
- Commits desta equipe: somente `leostella97`, sem trailer de ferramenta.
- O bot `google-labs-jules[bot]` permanece na lista por decisão anterior do
  usuário (TEAM_005): removê-lo exigiria reescrever o histórico público.

## Pedido 2 — timer de descanso por exercício
Antes: o exercício só exibia o texto "Descanso: Xs" (campo
`descanso_segundos` do plano). Não havia cronômetro no código.

### Decisões de design
- **Componente novo `CronometroDeDescanso`** em
  `apps/web/src/components/painel/cronometro-descanso.tsx`, renderizado no
  rodapé de cada `CartaoDeExercicio` (todos os exercícios de todos os dias).
- **Escolha do tempo**: botões fixos `1 min`, `2 min`, `3 min` (iniciam na
  hora), atalho extra `Sugerido mm:ss` com o `descanso_segundos` do plano —
  exibido só quando difere dos fixos, para não duplicar botão — e campo de
  **tempo personalizado em segundos** (5–3600; Enter também inicia), com
  mensagem de erro em vermelho para valor inválido.
- **Contagem por timestamp de término** (`Date.now + duração`, visor a cada
  250 ms), não por decremento: o tempo segue correto mesmo quando o
  navegador estrangula `setInterval` em aba em segundo plano — cenário comum
  na academia com a tela apagada.
- **Controles**: visor `mm:ss` (tabular-nums), `Pausar`/`Retomar` e `Zerar`
  (volta à escolha de tempo). Ao zerar volta aos atalhos — pronto para a
  próxima série.
- **Aviso de término**: três bipes de 880 Hz via Web Audio (sem arquivos de
  som; AudioContext criado sob demanda no gesto do usuário, com fallback
  `webkitAudioContext`), `navigator.vibrate` em celulares e aviso visual
  "Descanso concluído — próxima série!" por 5 s.
- **Estado efêmero e local**: nada é persistido — o timer é ferramenta da
  sessão, não dado do plano. Trocar o exercício remonta o cartão (key inclui
  o nome) e zera o timer, como já acontece com os campos.
- Funciona igual nos dois modos (navegador e servidor): é 100% frontend.

### Pontos tocados
- `apps/web/src/components/painel/cronometro-descanso.tsx` — componente novo.
- `apps/web/src/app/painel/treino/page.tsx` — import, substituição da linha
  estática "Descanso: Xs" pelo componente e remoção do ícone `Timer` do
  import do lucide (ficou sem uso na página; Regra 6).
- `.teams/TEAM_006_timer-de-descanso.md` — este arquivo.

## Estado
- [x] Testes de base passando antes da alteração (`testar:local` 92/92,
      typecheck web+api limpos — `npm install` foi necessário, não havia
      node_modules)
- [x] Implementação
- [x] Verificação depois: `typecheck` limpo · `testar:local` 92/92 ·
      `build:pages` 12 páginas + PWA ok
- [x] Contribuidor: Devin ausente confirmado; commits só como `leostella97`

## Notas de transferência
- No Windows/Git Bash o `build:pages` precisa de `MSYS_NO_PATHCONV=1`
  junto das variáveis, senão o MSYS converte `/ProtocolFit` para
  `C:/Program Files/Git/ProtocolFit` no `basePath` e o build quebra.
- Limite do campo personalizado: 5 s–3600 s (`MIN_SEGUNDOS`/`MAX_SEGUNDOS`
  no componente). O visor exibe mm:ss (acima de 59 min aparece "75:00" etc.).
- O som só sai se o usuário já tiver interagido com a página — exigência de
  autoplay dos navegadores (o clique em "Iniciar" já é o gesto).

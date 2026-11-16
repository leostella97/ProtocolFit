# TEAM_018 — Card de conquista: tema claro + dias de check-in no mês

## Pedido
> "coloque dias de chekin no mês no card de conquista; melhore o design do
> card de conquista, use cores claras, foque em alegria e motivação;
> dê git push; verifique se há falhas"

## Interpretação
- **"dias de check-in no mês"** = quantidade de dias com check-in registrado
  no mês corrente. Fonte: `ResumoDeCheckins.registros` (últimos 60 check-ins;
  o mês corrente cabe sempre — máx. 31 dias) filtrado pelo prefixo `AAAA-MM`
  de `hojeLocal()`. Conta todo check-in registrado, na mesma semântica da
  estatística "check-ins" já existente (`total` conta registros, não só
  dias cumpridos).
- **"cores claras + alegria e motivação"** = redesenho do PNG 1080×1080:
  fundo claro em gradiente pastel (pêssego → menta → céu), confetes
  festivos, cartão-ticket branco interno, número em gradiente verde com
  brilho dourado, grade 2×2 de estatísticas coloridas com emoji, e frase
  motivacional dinâmica conforme o momento da jornada.
- **"dê git push"** = commitar (padrão `TEAM_018: ...`) e enviar ao origin.
- **"verifique se há falhas"** = typecheck + suite jasmine + build.

## Design do novo card (canvas 1080×1080)
- Fundo: gradiente diagonal claro `#fff7ed → #ecfdf5 → #f0f9ff`.
- ~~Confetes~~ **REMOVIDOS a pedido do usuário** ("remova esse confete") —
  fundo limpo mantém o foco no número de destaque. As faíscas ✨ ao lado
  do número foram mantidas (não são confete).
- Cartão interno: ticket branco (raio 48) com borda e sombra suave.
- Cabeçalho: 🏆 + "ProtocolFit" em verde-escuro; tagline em caixa alta.
- Destaque: número gigante com gradiente verde + brilho radial dourado;
  rótulo em caixa alta + **frase motivacional** dinâmica:
  - sequência ≥ 7 → "Uma semana de foco — você está imparável! 🚀"
  - sequência > 0 → "Sua sequência está em chamas — continue! 🔥"
  - total > 0 → "Cada check-in é uma vitória — celebre! 🎉"
  - jornada nova → "O primeiro passo é o mais corajoso — bora! 💪"
- Grade 2×2 de estatísticas (era 3×1): check-ins ✅ · recorde 🏅 ·
  **dias no mês 📅 (novo)** · kg evoluídos/objetivo ⚖️/🎯 — cada uma com
  cor de destaque própria (esmeralda, âmbar, céu, rosa).
- Rodapé: nome · objetivo · data + URL do site.

## Arquivos
- `apps/web/src/components/painel/cartao-conquista.tsx` (redesenho + stat)
- `.teams/TEAM_018_card-conquista-claro.md` (este log)

## Verificação
- [x] testes base (jasmine) — 87/87 antes das mudanças
- [x] typecheck web + api — limpo
- [x] testes após mudanças — 87/87
- [x] build:pages + validação PWA — verde
- [x] build:api — verde
- [x] smoke test do desenho contra stub de canvas — 3 cenários,
      66 textos, coordenadas finitas (script temporário descartado)

## Rebase + falhas encontradas no remoto (corrigidas nesta equipe)
O `git push` inicial foi rejeitado: 19 commits novos no origin/main.
Rebase aplicado sem conflitos textuais, mas o merge trouxe problemas:

1. **Duplicata de `fraseMotivacional`** — o remoto (a6674af) adicionou uma
   frase motivacional própria (consciente de recorde) no cabeçalho do
   cartão. Mantida como FONTE ÚNICA: a mesma frase alimenta cabeçalho e
   PNG. Minha versão mais simples foi removida.
2. **BOM UTF-8 em 3 JSONs** (`dietas/luta-{bulk,cut,vegetariana}.json`,
   commit b0a8e2b) — quebrava `JSON.parse` do copiar-modelos.mjs.
   BOM removido dos arquivos.
3. **`</div>` faltante** em `painel/perfil/page.tsx` (commit 68b6730) —
   a grade do "músculo focado" ficava aberta; build Turbopack quebrado.
4. **`musculo_focado` obrigatório sem valor em 3 pontos** (commit e53ea83):
   - `web/src/lib/repositorio-local.ts` — perfil novo nascia sem o campo
     (agora `null`: só o PATCH de estilo define o foco);
   - `web/scripts/testar-motor-navegador.ts` — fixture de teste;
   - `api/src/bd/banco.ts` — `buscarPerfilPorUsuario` não mapeava a
     coluna nova, perdendo o valor gravado no retorno.

## Nota de transferência
- O remoto reduziu a prévia do canvas para `w-[216px]` fixo (série de
  commits de ajuste). Mantido — decisão deles; o PNG segue 1080×1080.
- `fraseMotivacional`/`metaAVista` (cabecalho) são de outra equipe —
  avaliar no futuro se a lógica `seq > rec` (inalcançável, pois
  sequencia_maxima >= sequencia_atual por definição) merece revisão.

## Decisões
- "Dias no mês" conta **registros** de check-in (paridade com a estatística
  "check-ins" = `total` de registros), não apenas dias cumpridos.
- Posições dos confetes são determinísticas (modular) para que a prévia
  seja estável entre renders.
- Sem dependências novas; somente Canvas 2D nativo.

## Bloqueios / TODO
- Revisão visual final do PNG é manual (não há screenshot no CI).

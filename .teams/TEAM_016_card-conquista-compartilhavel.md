# TEAM_016 — Card de conquista compartilhável (imagem + redes sociais)

## Pedido
> "gerar card de conquista no index imagem permite salvar compartilhar facebook, instagram, whatsapp"

## Interpretação
- **"index"** = página inicial do app autenticado (`/painel`), onde moram os dados
  de conquista (sequência de check-ins, total, delta de peso, objetivo).
- Card que gera uma **imagem PNG** (1080×1080 — quadrado, formato Instagram)
  com as conquistas do usuário, desenhada em `<canvas>` (zero dependências).
- Ações: **salvar** (download PNG) e **compartilhar** em Facebook,
  Instagram e WhatsApp.

## Design

### Imagem (canvas 1080×1080, gerada no cliente)
- Fundo: gradiente verde-escuro da identidade + brilho radial sutil.
- Cabeçalho: troféu + wordmark "ProtocolFit".
- Destaque central: número gigante da sequência atual ("X dias seguidos")
  — fallback: total de check-ins; "Dia 1" quando não há check-in ainda.
- Grade de 3 estatísticas: check-ins · recorde · kg evoluído (ou objetivo).
- Rodapé: nome do usuário · data · rótulo do objetivo · URL pública.
- Redesenha quando os dados mudam (`useEffect` no canvas ref — o próprio
  canvas vira a prévia, escalada via CSS).

### Compartilhamento (ordem de preferência)
1. **`navigator.share` com `files`** — mobile envia o PNG real para
   WhatsApp/Instagram/etc. via planilha nativa (detecção por `canShare`).
2. **WhatsApp**: `wa.me/?text=` (texto + link — URL scheme não anexa imagem).
3. **Facebook**: `sharer/sharer.php?u=&quote=` (link + frase da conquista).
4. **Instagram**: sem endpoint web de post — o botão baixa a imagem e abre
   instagram.com com dica de uso (no mobile o share nativo cobre o caso).
5. **Salvar**: `canvas.toBlob` → `<a download>`.

### Restrições de API reais respeitadas
- WhatsApp/Facebook web só aceitam URL/texto — imagem vai junto apenas no
  share nativo de arquivo (mobile).
- Instagram não tem API web de compartilhamento → download + dica.

## Arquivos
- `apps/web/src/components/painel/cartao-conquista.tsx` (novo)
- `apps/web/src/app/painel/page.tsx` (integração — abaixo dos gráficos)

## Verificação (resultado)
- [x] typecheck web — limpo
- [x] build:pages + validação PWA — verde
- [x] função de desenho extraída e executada contra stub de canvas —
      4 cenários (sequência, jornada nova, valores extremos) sem erro/NaN
- [x] testar:local — 103/103

## Decisões
- `desenharCardDeConquista` é função pura de módulo (ctx + dados) —
  testável sem DOM.
- Troféu do cabeçalho: emoji 🏆 via `fillText` (render nativo em toda
  plataforma) em vez de path vetorial manual.
- `terceiraEstatistica` memoizada — identidade estável nas deps do efeito
  de desenho.
- Sem dependências novas; compartilhamento usa só APIs nativas do browser.

## Bloqueios / TODO
- Revisão visual final do PNG é manual (não há screenshot no CI).
- WhatsApp/Facebook web não aceitam anexo de imagem por URL — limitação
  das plataformas; imagem vai só no share nativo de arquivo (mobile).

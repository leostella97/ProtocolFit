# TEAM_015 — Quantas vezes treinar no Treino + Estilo de dieta na Dieta/Perfil

## Pedido
"trocar treino, troca com objetivo de treino, quantas vezes treinar em: treino,
perfil; trocar dieta em: dieta, perfil" — completar o que faltava:
- **Quantas vezes treinar** editável no Treino (perfil já tinha chips de dias).
- **Trocar dieta** disponível na página de Dieta e no Perfil — antes a dieta
  só seguia o slug do estilo de treino, sem seleção própria.

## Decisões
- `variacao_dieta` novo no perfil — espelho arquitetônico de `variacao_treino`:
  - `null` = **automático** (comportamento anterior: dieta pareada pelo slug
    do `variacao_treino`, fallback para `{objetivo}.json`);
  - `"padrao"` = força a dieta base `{objetivo}.json`;
  - slug = `{objetivo}-{slug}.json` (fallback do buscador = base, como antes).
  Resolução: `buscarModeloDieta(objetivo, variacao_dieta ?? variacao_treino)`
  nos DOIS motores (API `geradorDePlanos`, web `repositorio-local.gerarPlanos`).
- `modelo_origem` da dieta agora usa o caminho REALMENTE resolvido
  (`caminhoDoModeloDieta`), corrigindo a imprecisão anterior que gravava o
  slug pedido mesmo quando o arquivo pareado não existia.
- `VariacaoDeDieta { id, nome, arquivo, objetivo }` — `listarVariacoesDeDieta()`
  varre `modelos/dietas/` na API (cache) e lê `indice.variacoes_de_dieta` no
  navegador (gerado pelo `copiar-modelos.mjs`).
- `PATCH /api/perfil/dieta { variacao_dieta }` espelha `/perfil/treino`;
  `atualizarEstiloDeDietaLocal` espelha o local; `atualizarEstiloDeDieta` na api.ts.
- "Quantas vezes treinar" no Treino: seletor 2–7 (+1 se o perfil tiver 1 dia).
  Ajuste determinístico dos dias: ordena os escolhidos na semana canônica,
  corta do fim ou completa com os próximos dias livres; reseta o estilo se
  não existe para a nova quantidade (mesma regra da troca de objetivo).
- Troca de objetivo (treino/perfil) agora também resseta `variacao_dieta`
  quando o slug não existe no objetivo novo — sem isso a edição wipeava o
  campo e a API rejeitaria slug inválido.

## Arquivos
- API: tipos (VariacaoDeDieta, Perfil.variacao_dieta, OpcoesDoSistema),
  banco.ts (coluna + migração + upsert), carregadorModelos
  (listarVariacoesDeDieta + caminhoDoModeloDieta), geradorDePlanos,
  rotas/perfil (POST aceita/valida, PATCH /dieta novo), rotas/opcoes.
- Web: tipos, tipos-modelos (IndiceDeModelos), copiar-modelos.mjs,
  carregadorModelos (listarVariacoesDeDieta), repositorio-local
  (validação, geração, salvarPerfil, atualizarEstiloDeDietaLocal,
  buscarOpcoesLocal, migração leve), api.ts (CorpoPerfil + wrapper),
  util.ts (variacoesDeDietaDoObjetivo).
- UI: treino (seletor "Quantas vezes treinar" + preservação de
  variacao_dieta na troca de objetivo), dieta (seletor "Estilo de dieta"
  no resumo), perfil (cartão "Estilo de dieta" + linha "Estilo da dieta"
  + preservação na edição).

## Verificação
- typecheck api + web: limpo.
- Jasmine: 74 specs, 0 falhas.
- testar:local: 103/103 (7 novas verificações de estilo de dieta).
- testar:motor: 20/20. validar-modelos: 381 arquivos, 0 erros.
- Matriz: 48/48. Dados possíveis: 280/280. build:pages + PWA ok.
- E2E real na API: PATCH /dieta com slug/padrao/auto/outro-objetivo/inválido/
  ausente → comportamento correto; POST /perfil valida e persiste;
  pareamento automático provado (treino=mma → luta-mma.json);
  GET /opcoes expõe variacoes_de_dieta (160 itens).

# ============================================================================
# Dockerfile do frontend do ProtocolFit (Next.js em modo standalone)
# Uso: docker build --build-arg NEXT_PUBLIC_URL_API=https://SEU-SITE.com/api -t protocolfit-web ./apps/web
# ============================================================================

# ---- Etapa 1: build do Next.js ----------------------------------------------
FROM node:22-alpine AS construcao
WORKDIR /app

# Copia os manifestos primeiro (aproveita o cache de camadas do Docker).
COPY package*.json ./

# Instala TODAS as dependências (runtime + dev para o build).
# Usa `npm install` porque o contexto do build é só esta pasta (o
# package-lock.json fica na raiz do monorepo, fora do contexto).
RUN npm install --no-audit --no-fund

# Copia o restante do projeto do frontend.
COPY . .

# Desliga a telemetria anônima do Next.js no build.
ENV NEXT_TELEMETRY_DISABLED=1

# URL da API usada pelo NAVEGADOR do usuário final (definida no build).
# Em produção, deve ser o endereço público da API (ex.: https://SEU-SITE.com/api).
ARG NEXT_PUBLIC_URL_API=https://SEU-SITE.com/api
ENV NEXT_PUBLIC_URL_API=$NEXT_PUBLIC_URL_API

# Gera o build de produção (modo standalone para imagem enxuta).
RUN npm run build

# ---- Etapa 2: imagem enxuta de produção -------------------------------------
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copia o servidor standalone gerado pelo Next.js.
# ATENÇÃO (monorepo): o Next aninha a saída em standalone/apps/web/ porque o
# aplicativo vive em um subdiretório do workspace — copiamos esse conteúdo
# para a raiz do container (o server.js passa a ficar em /app/server.js).
COPY --from=construcao /app/.next/standalone/apps/web ./

# Copia os assets estáticos e a pasta public.
COPY --from=construcao /app/.next/static ./.next/static
COPY --from=construcao /app/public ./public

# Documenta a porta usada pelo Next.js.
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Sobe o servidor standalone.
CMD ["node", "server.js"]

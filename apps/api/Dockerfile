# ============================================================================
# Dockerfile da API do ProtocolFit (Fastify + TypeScript + SQLite)
# Uso: docker build -t protocolfit-api ./apps/api
# ============================================================================

# ---- Etapa 1: compilar o TypeScript ----------------------------------------
FROM node:22-alpine AS construcao
WORKDIR /app

# Copia os manifestos primeiro (aproveita o cache de camadas do Docker).
COPY package*.json ./

# Instala TODAS as dependências (runtime + dev para o build com tsc).
# Usa `npm install` porque o contexto do build é só esta pasta (o
# package-lock.json fica na raiz do monorepo, fora do contexto).
RUN npm install --no-audit --no-fund

# Copia o código-fonte e a configuração do TypeScript.
COPY tsconfig.json ./
COPY src ./src

# Compila o TypeScript para a pasta dist/.
RUN npm run build

# ---- Etapa 2: imagem enxuta de produção ------------------------------------
FROM node:22-alpine
WORKDIR /app

# Modo produção (otimizações do Node e das bibliotecas).
ENV NODE_ENV=production

# Copia as dependências já instaladas na etapa de construção.
COPY --from=construcao /app/node_modules ./node_modules

# Copia o código compilado e os modelos JSON mestres (somente leitura).
COPY --from=construcao /app/dist ./dist
COPY --from=construcao /app/package.json ./package.json
COPY modelos ./modelos

# Cria a pasta do banco SQLite (monte um VOLUME aqui para persistir os dados).
RUN mkdir -p /app/dados

# Documenta a porta usada pelo servidor Fastify.
EXPOSE 3333

# Sobe o servidor compilado.
CMD ["node", "dist/servidor.js"]

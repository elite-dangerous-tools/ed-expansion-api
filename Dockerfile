FROM node:24-alpine

# Habilitar corepack para usar pnpm sin instalarlo aparte
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

# Copiar package.json primero (capa cacheable)
COPY package.json ./

# Instalar dependencias (solo se re-ejecuta si cambia package.json)
RUN pnpm install --prod

# Copiar el resto del codigo fuente
COPY . .

ENV UV_THREADPOOL_SIZE=2
ENV NODE_OPTIONS="--max-old-space-size=64 --max-semi-space-size=2"
ENV NODE_ENV=production

EXPOSE 5000
CMD [ "node", "server.js" ]

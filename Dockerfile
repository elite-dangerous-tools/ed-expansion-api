FROM node:24-alpine

# pnpm vía corepack; la versión la fija package.json (packageManager)
RUN corepack enable

WORKDIR /usr/src/app

# package.json primero para cachear la capa de dependencias
COPY package.json ./

RUN pnpm install --prod && pnpm store prune

# Copiar el resto del codigo fuente
COPY . .

# Heap 96MB: medido pico ~77MB en la peor petición (75 ly); con el rango
# de producción a 50 ly el pico real es mucho menor (r³). El OOM de JS
# (respuesta HTTP) salta antes que el SIGKILL del kernel (256M→192M).
ENV NODE_OPTIONS="--max-old-space-size=96 --max-semi-space-size=4"
ENV NODE_ENV=production

EXPOSE 5000

USER node
CMD [ "node", "server.js" ]

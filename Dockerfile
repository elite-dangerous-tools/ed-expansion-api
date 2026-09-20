FROM node:24-alpine

# pnpm vía corepack; la versión la fija package.json (packageManager)
RUN corepack enable

WORKDIR /usr/src/app

# package.json primero para cachear la capa de dependencias
COPY package.json ./

RUN pnpm install --prod && pnpm store prune

# Copiar el resto del codigo fuente
COPY . .

# Heap 160MB: medido pico ~77MB en la peor petición (75 ly). Cabe 1 petición
# grande por margen y falla con OOM de JS (respuesta HTTP) antes de que el RSS
# llegue al límite del contenedor (256M): nunca SIGKILL del kernel.
ENV NODE_OPTIONS="--max-old-space-size=160 --max-semi-space-size=4"
ENV NODE_ENV=production

EXPOSE 5000

USER node
CMD [ "node", "server.js" ]

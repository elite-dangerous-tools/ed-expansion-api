FROM node:24-alpine

# Habilitar corepack para usar pnpm sin instalarlo aparte.
# La versión concreta se fija en package.json (campo packageManager), así el
# build es reproducible y las cachés no cambian hasta que se suba a posta
RUN corepack enable

WORKDIR /usr/src/app

# Copiar package.json primero (capa cacheable)
COPY package.json ./

# Instalar dependencias (solo se re-ejecuta si cambia package.json).
# Al acabar limpiamos el store de pnpm: si no, se queda dentro de la imagen
# (decenas de MB) y en runtime no hace falta. node_modules usa enlaces duros
# al store, así que sigue funcionando sin él. Así evitamos el multi-stage.
RUN pnpm install --prod && pnpm store prune

# Copiar el resto del codigo fuente
COPY . .

# 128MB de heap: margen suficiente para /api/beneficio y /api/sistemas_alcance
# (hasta 5 páginas x 500 estaciones con markets completos en memoria)
# El semi-space de 4MB reduce la presión de GC (menos CPU en picos de peticiones)
ENV NODE_OPTIONS="--max-old-space-size=128 --max-semi-space-size=4"
ENV NODE_ENV=production

EXPOSE 5000

# El proceso corre como usuario sin privilegios (buena práctica de seguridad)
USER node
CMD [ "node", "server.js" ]

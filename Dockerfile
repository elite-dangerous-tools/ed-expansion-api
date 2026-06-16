FROM node:20-alpine as build

WORKDIR /usr/src/app
COPY . .

RUN yarn --prod

ENV UV_THREADPOOL_SIZE=1
ENV NODE_OPTIONS="--max-old-space-size=48"
ENV NODE_ENV=production

EXPOSE 5000
CMD [ "yarn", "start" ]

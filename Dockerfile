FROM node:20-alpine as build

WORKDIR /usr/src/app
COPY . .

RUN yarn --prod

EXPOSE 5000
CMD [ "yarn", "start" ]

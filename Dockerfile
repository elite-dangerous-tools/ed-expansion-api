FROM node:20-alpine as build

WORKDIR /usr/src/app
COPY . .

# RUN yarn install
RUN yarn add express

EXPOSE 5000
CMD [ "yarn", "start" ]

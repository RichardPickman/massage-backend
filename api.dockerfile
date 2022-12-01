FROM node:lts

WORKDIR /usr/local/api

COPY package.json .
COPY build .
COPY .env .

RUN npm install

EXPOSE 8280

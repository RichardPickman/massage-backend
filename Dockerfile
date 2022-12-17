FROM node:lts

WORKDIR /usr/local/api

COPY package.json .
COPY build .
COPY .env .

CMD ["node", "index.js"]

EXPOSE 8280

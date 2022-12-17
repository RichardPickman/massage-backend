FROM node:lts

WORKDIR /usr/local/api

COPY package.json .
COPY build .
COPY .env .

RUN npm install

CMD ["node", "index.js"]

EXPOSE 8280

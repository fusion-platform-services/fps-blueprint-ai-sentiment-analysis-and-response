FROM node:23-alpine

WORKDIR /app

COPY response/package.json ./
RUN npm install

COPY response/. .


CMD ["node", "src/index.js"]

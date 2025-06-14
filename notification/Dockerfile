FROM node:23-alpine

WORKDIR /app

COPY notification/package.json ./
RUN npm install

COPY notification/. .


CMD ["node", "src/index.js"]

FROM node:23-alpine

WORKDIR /app

COPY anomaly-detection/package.json ./
RUN npm install

COPY anomaly-detection/. .

CMD ["node", "src/index.js"]

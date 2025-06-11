FROM node:18-alpine

WORKDIR /app

COPY ingestion/package.json ./
RUN npm install

COPY ingestion/. .

# Copy data from root project folder into /app/data in the container
COPY data ./data

CMD ["node", "src/index.js"]

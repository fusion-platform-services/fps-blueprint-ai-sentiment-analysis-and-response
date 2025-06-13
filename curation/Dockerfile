FROM node:23-alpine

WORKDIR /app

COPY curation/package.json ./
RUN npm install

COPY curation/. .

# Copy data from root project folder into /app/data in the container
COPY data ./data

CMD ["node", "src/index.js"]

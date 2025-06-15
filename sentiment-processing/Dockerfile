FROM node:23-alpine

WORKDIR /app

COPY sentiment-processing/package.json ./
RUN npm install

COPY sentiment-processing/. .

# Copy data from root project folder into /app/data in the container
COPY data ./data
COPY sentiment-processing/prompts ./prompts

CMD ["node", "src/index.js"]

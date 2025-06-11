const fs = require('fs');
const amqp = require('amqplib');
const dotenv = require('dotenv');

dotenv.config();

const RABBITMQ_URL = `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@rabbitmq:5672`;
const INGESTION_REVIEWS_FILE = process.env.INGESTION_REVIEWS_FILE || './data/mock-reviews.json';
const QUEUE_NAME = 'incoming';

async function main() {
  // Read and parse the reviews JSON file
  const reviews = JSON.parse(fs.readFileSync(INGESTION_REVIEWS_FILE, 'utf8'));

  // Connect to RabbitMQ
  const conn = await amqp.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();

  // Ensure the queue exists
  await channel.assertQueue(QUEUE_NAME, { durable: true });

  // Send each review as a separate message
  for (const review of reviews) {
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(review)), { persistent: true });
    console.log(`Sent reviewId=${review.reviewId}`);
  }

  // Close connection after a short delay to ensure all messages are sent
  setTimeout(() => {
    channel.close();
    conn.close();
    console.log('All reviews sent. Connection closed.');
  }, 500);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

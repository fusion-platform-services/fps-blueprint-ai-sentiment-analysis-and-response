const fs = require('fs');
const amqp = require('amqplib');
const dotenv = require('dotenv');

dotenv.config();

const RABBITMQ_URL = `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@rabbitmq:5672`;
const NOTIFICATION_QUEUE_NAME = 'notification';

// Dummy paging API function
function triggerPagingAPI(notification) {
  // This is a dummy API. Replace with real paging logic as needed.
  console.log(`[DUMMY PAGING API] Escalation triggered for reviewId=${notification.reviewId}:`, notification);
}

async function main() {
  // Connect to RabbitMQ
  const conn = await amqp.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();

  // Ensure the queue exists
  await channel.assertQueue(NOTIFICATION_QUEUE_NAME, { durable: true });

  console.log(`Waiting for escalation notifications in queue: ${NOTIFICATION_QUEUE_NAME}`);

  channel.consume(NOTIFICATION_QUEUE_NAME, (msg) => {
    if (msg !== null) {
      const notification = JSON.parse(msg.content.toString());
      triggerPagingAPI(notification);
      channel.ack(msg);
    }
  }, { noAck: false });

  // Service remains active, no connection close or process exit here
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

const fs = require('fs');
const amqp = require('amqplib');
const dotenv = require('dotenv');

dotenv.config();

const RABBITMQ_URL = `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@rabbitmq:5672`;
const OUTGOING_QUEUE_NAME = 'outgoing';

// Dummy outgoing queue API function
// This is a dummy API. Replace with real outgoing logic as needed.
function triggerOutgoingQueueAPI(message) {
  if (message.channel) {
    console.log(`[DUMMY OUTGOING QUEUE API] Triggered for channel=${message.channel}:`, message);
  } else {
    console.log(`[DUMMY OUTGOING QUEUE API] No channel specified:`, message);
  }
}

async function main() {
  // Connect to RabbitMQ
  const conn = await amqp.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();

  // Ensure the queue exists
  await channel.assertQueue(OUTGOING_QUEUE_NAME, { durable: true });

  console.log(`Waiting for outgoing messages in queue: ${OUTGOING_QUEUE_NAME}`);

  channel.consume(OUTGOING_QUEUE_NAME, (msg) => {
    if (msg !== null) {
      const message = JSON.parse(msg.content.toString());
      triggerOutgoingQueueAPI(message);
      channel.ack(msg);
    }
  }, { noAck: false });

  // Service remains active, no connection close or process exit here
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

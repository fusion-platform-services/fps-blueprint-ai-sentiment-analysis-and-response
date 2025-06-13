const fs = require('fs');
const amqp = require('amqplib');
const dotenv = require('dotenv');

dotenv.config();

const RABBITMQ_URL = `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@rabbitmq:5672`;
const CUSTOMERS_FILE = `${process.env.CUSTOMERS_FILE}`;
const INCOMING_QUEUE_NAME = 'incoming';
const CURATED_QUEUE_NAME = 'curated';

async function main() {
  // Read and parse the customers JSON file
  const customers = JSON.parse(fs.readFileSync(CUSTOMERS_FILE, 'utf8'));
  const customersByExternalId = {};
  for (const customer of customers) {
    if (customer.externalCustomerId) {
      customersByExternalId[customer.externalCustomerId] = customer;
    }
  }

  // Connect to RabbitMQ
  const conn = await amqp.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();

  await channel.assertQueue(INCOMING_QUEUE_NAME, { durable: true });
  await channel.assertQueue(CURATED_QUEUE_NAME, { durable: true });

  console.log('Waiting for messages in queue:', INCOMING_QUEUE_NAME);

  channel.consume(INCOMING_QUEUE_NAME, async (msg) => {
    if (msg !== null) {
      const record = JSON.parse(msg.content.toString());
      console.log('Received:', JSON.stringify(record, null, 2));

      let enrichedRecord = { ...record };
      if (record.externalCustomerId && customersByExternalId[record.externalCustomerId]) {
        enrichedRecord = { ...record, customer: customersByExternalId[record.externalCustomerId] };
      }

      console.log('Enriched:', JSON.stringify(enrichedRecord, null, 2));

      channel.sendToQueue(CURATED_QUEUE_NAME, Buffer.from(JSON.stringify(enrichedRecord)), { persistent: true });
      channel.ack(msg);
    }
  }, { noAck: false });

  // Service remains active, no connection close or process exit here
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

const fs = require('fs');
const amqp = require('amqplib');
const dotenv = require('dotenv');
const { Client } = require('pg');
const { getAIResponse } = require('./openai.js');

dotenv.config();

const RABBITMQ_URL = `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@rabbitmq:5672`;
const POSTGRES_URL = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@postgres:5432/${process.env.POSTGRES_DB}`;
const CURATED_QUEUE_NAME = 'curated';

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS processed_responses (
      review_id INT PRIMARY KEY,
      external_customer_id TEXT,
      customer_name TEXT,
      review_text TEXT,
      sentiment TEXT,
      theme TEXT,
      ai_response TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function processReview(record, client) {
  const reviewText = record.review || record.reviewText || record.text || '';
  const reviewId = record.reviewId || record.id || null;
  const externalCustomerId = record.externalCustomerId || null;
  const customerName = record.customer?.name || null;

  const prompt = `
Analyze the customer review based on the following three criteria: 
- sentiment: could be 'Positive', 'Neutral', or 'Negative'.
- theme: generalize key words from the review.
- response: only for negative reviews write a response to the customer. Offer free shipping as needed. For extreme cases offer 5% discount coupon for the next purchase in the store.

Write output as a JSON formatted string.
`;

  let sentiment = null, theme = null, ai_response = null;

  try {
    const response = await getAIResponse(prompt, reviewText);
    console.log('OpenAI response:', response.output_text);

    let parsed;
    try {
      parsed = JSON.parse(response.output_text);
      sentiment = parsed.sentiment || null;
      theme = parsed.theme || null;
      ai_response = parsed.response || null;
    } catch (e) {
      ai_response = aiText;
    }
  } catch (err) {
    console.error('OpenAI API error:', err.message);
  }

  await client.query(
    `INSERT INTO processed_responses 
      (review_id, external_customer_id, customer_name, review_text, sentiment, theme, ai_response)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (review_id) DO NOTHING`,
    [
      reviewId,
      externalCustomerId,
      customerName,
      reviewText,
      sentiment,
      theme,
      ai_response
    ]
  );
}

async function main() {

  // Connect to PostgreSQL
  const pgClient = new Client({ connectionString: POSTGRES_URL });
  await pgClient.connect();
  await ensureTable(pgClient);

  // Connect to RabbitMQ
  const conn = await amqp.connect(RABBITMQ_URL);
  const channel = await conn.createChannel();

  await channel.assertQueue(CURATED_QUEUE_NAME, { durable: true });

  console.log('Waiting for messages in queue:', CURATED_QUEUE_NAME);

  channel.consume(CURATED_QUEUE_NAME, async (msg) => {
    if (msg !== null) {
      const record = JSON.parse(msg.content.toString());
      console.log('Received:', JSON.stringify(record, null, 2));

      // Enrich with customer if needed
      const enrichedRecord = { ...record };
      await processReview(enrichedRecord, pgClient);

      channel.ack(msg);
    }
  }, { noAck: false });

  // Service remains active, no connection close or process exit here
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

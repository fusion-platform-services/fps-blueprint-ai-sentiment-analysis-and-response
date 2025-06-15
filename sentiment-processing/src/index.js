const fs = require('fs');
const amqp = require('amqplib');
const dotenv = require('dotenv');
const { Client } = require('pg');
const { getAIResponse } = require('./openai.js');

dotenv.config();

// Read prompt from Markdown file (skip the heading)
const promptRaw = fs.readFileSync(
  require('path').resolve(__dirname, '../prompts/review-analysis-prompt.md'),
  'utf8'
);
const reviewAnalysisPrompt = promptRaw
  .split('\n')
  .filter(line => !line.startsWith('#'))
  .join('\n')
  .trim();

const RABBITMQ_URL = `amqp://${process.env.RABBITMQ_DEFAULT_USER}:${process.env.RABBITMQ_DEFAULT_PASS}@rabbitmq:5672`;
const POSTGRES_URL = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@postgres:5432/${process.env.POSTGRES_DB}`;
const CURATED_QUEUE_NAME = 'curated';
const OUTGOING_QUEUE_NAME = 'outgoing';
const NOTIFICATION_QUEUE_NAME = 'notification';

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS processed_responses (
      review_id INT PRIMARY KEY,
      review_date TIMESTAMPTZ,
      channel TEXT,
      external_customer_id TEXT,
      customer_name TEXT,
      review_text TEXT,
      star_rating INT,
      location TEXT,
      escalation BOOLEAN DEFAULT FALSE,
      sentiment TEXT,
      theme TEXT,
      ai_response TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function processReview(record, client, amqpChannel) {
  const reviewText = record.review || record.reviewText || record.text || '';
  const starRating = record.starRating || record.rating || 0;
  const location = record.location || null;
  const reviewId = record.reviewId || record.id || null;
  const reviewDate = record.reviewDate || record.datetime || new Date().toISOString();
  const externalCustomerId = record.externalCustomerId || null;
  const channel = record.channel || 'unknown';
  const customerName = record.customer?.name || null;

  // Use prompt from JSON file
  const prompt = reviewAnalysisPrompt;

  let sentiment = null, theme = null, ai_response = null, escalation = false;

  // ---------
  // Get AI response
  // ---------
  try {
    const response = await getAIResponse(prompt, reviewText);
    console.log('OpenAI response:', response.output_text);

    let parsed;
    try {
      parsed = JSON.parse(response.output_text);
      sentiment = parsed.sentiment || null;
      theme = parsed.theme || null;
      escalation = parsed.escalation || false;
      ai_response = parsed.response || null;
    } catch (e) {
      ai_response = aiText;
    }
  } catch (err) {
    console.error('OpenAI API error:', err.message);
  }

  // ---------
  // Insert into PostgreSQL
  // ---------
  await client.query(
    `INSERT INTO processed_responses 
      (review_id, review_date, channel, external_customer_id, customer_name, review_text, star_rating, location, escalation, sentiment, theme, ai_response)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (review_id) DO NOTHING`,
    [
      reviewId,
      reviewDate,
      channel,
      externalCustomerId,
      customerName,
      reviewText,
      starRating,
      location,
      escalation,
      sentiment,
      theme,
      ai_response
    ]
  );

  // ---------
  // Send AI response to the outgoing queue
  // ---------
  if (amqpChannel && ai_response) {
    const outgoingPayload = {
      reviewId,
      channel,
      externalCustomerId,
      customerName,
      reviewText,
      starRating,
      location,
      escalation,      
      sentiment,
      theme,
      ai_response
    };
    await amqpChannel.assertQueue(OUTGOING_QUEUE_NAME, { durable: true });
    amqpChannel.sendToQueue(
      OUTGOING_QUEUE_NAME,
      Buffer.from(JSON.stringify(outgoingPayload)),
      { persistent: true }
    );

    // ---------
    // Send to notification queue if escalation is true
    // ---------
    if (escalation) {
      await amqpChannel.assertQueue(NOTIFICATION_QUEUE_NAME, { durable: true });
      amqpChannel.sendToQueue(
        NOTIFICATION_QUEUE_NAME,
        Buffer.from(JSON.stringify(outgoingPayload)),
        { persistent: true }
      );
    }
  }
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
      await processReview(enrichedRecord, pgClient, channel);

      channel.ack(msg);
    }
  }, { noAck: false });

  // Service remains active, no connection close or process exit here
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

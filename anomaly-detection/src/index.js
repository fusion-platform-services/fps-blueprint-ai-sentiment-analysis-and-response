const fs = require('fs');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config();

const POSTGRES_URL = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@postgres:5432/${process.env.POSTGRES_DB}`;

// Trend & anomaly detection: aggregates by day/channel/sentiment/theme, flags anomalies
async function detectTrendsAndAnomalies(pgClient) {
  // 1. Create aggregate table if not exists
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS response_trends (
      trend_date DATE,
      channel TEXT,
      location TEXT,
      sentiment TEXT,
      theme TEXT,
      review_count INT,
      escalation_count INT DEFAULT 0,
      avg_star_rating FLOAT,
      anomaly BOOLEAN DEFAULT FALSE,
      PRIMARY KEY (trend_date, channel, sentiment, theme)
    );
  `);

  // Overwrite (truncate) the table before inserting new data
  await pgClient.query(`TRUNCATE TABLE response_trends;`);

  // 2. Aggregate daily stats for last 30 days
  const aggRes = await pgClient.query(`
    SELECT
      DATE(review_date) AS trend_date,
      channel,
      location,
      sentiment,
      theme,
      COUNT(*) AS review_count,
      COUNT(CASE WHEN escalation = true THEN 1 END) AS escalation_count,
      AVG(star_rating) AS avg_star_rating
    FROM processed_responses
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY trend_date, channel, location, sentiment, theme
    ORDER BY trend_date DESC
  `);

  // 3. For each (channel, sentiment, theme), compute mean/stddev for review_count
  //    and flag anomalies (z-score > 2)
  const groupKey = row => `${row.channel}|${row.sentiment}|${row.theme}`;
  const groups = {};
  aggRes.rows.forEach(row => {
    const key = groupKey(row);
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });

  const inserts = [];
  for (const key in groups) {
    const rows = groups[key];
    const counts = rows.map(r => Number(r.review_count));
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const stddev = Math.sqrt(counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / counts.length) || 1;
    rows.forEach(r => {
      const z = (r.review_count - mean) / stddev;
      const anomaly = z > 2;
      inserts.push({
        ...r,
        anomaly
      });
    });
  }

  // 4. Upsert into response_trends
  for (const row of inserts) {
    await pgClient.query(`
      INSERT INTO response_trends (trend_date, channel, location, sentiment, theme, review_count, escalation_count, avg_star_rating, anomaly)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      row.trend_date,
      row.channel,
      row.location,
      row.sentiment,
      row.theme,
      row.review_count,
      row.escalation_count,
      row.avg_star_rating,
      row.anomaly
    ]);
  }
}

async function main() {
  // Connect to PostgreSQL
  const pgClient = new Client({ connectionString: POSTGRES_URL });
  await pgClient.connect();

  // Run trend & anomaly detection
  await detectTrendsAndAnomalies(pgClient);

  await pgClient.end();
}

// Run main once every hour
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
setInterval(() => {
  main().catch(err => {
    console.error('Error:', err);
  });
}, 60 * 60 * 1000); // 1 hour in milliseconds

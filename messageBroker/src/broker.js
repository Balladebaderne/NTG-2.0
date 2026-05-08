const amqp = require('amqplib');

const RABBITMQ_URL = `amqp://${process.env.RABBITMQ_USER || 'guest'}:${process.env.RABBITMQ_PASS || 'guest'}@${process.env.RABBITMQ_HOST || 'rabbitmq'}:${process.env.RABBITMQ_PORT || 5672}`;

const RETRY_INTERVAL_MS = 5000;
const MAX_RETRIES = 10;

let connection = null;
let channel = null;

async function connect(retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[broker] Connecting to RabbitMQ (attempt ${attempt}/${retries})...`);
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();

      connection.on('close', () => console.warn('[broker] Connection closed'));
      connection.on('error', (err) => console.error('[broker] Connection error:', err.message));

      console.log('[broker] Connected to RabbitMQ');
      return channel;
    } catch (err) {
      console.error(`[broker] Connection failed: ${err.message}`);
      if (attempt === retries) throw new Error('[broker] Max retries reached, giving up');
      await new Promise((res) => setTimeout(res, RETRY_INTERVAL_MS));
    }
  }
}

async function publish(exchange, routingKey, message) {
  if (!channel) throw new Error('[broker] Not connected — call connect() first');
  const content = Buffer.from(JSON.stringify(message));
  channel.publish(exchange, routingKey, content, { contentType: 'application/json', persistent: true });
  console.log(`[broker] Published to exchange="${exchange}" routingKey="${routingKey}"`);
}

async function consume(queue, handler) {
  if (!channel) throw new Error('[broker] Not connected — call connect() first');
  await channel.assertQueue(queue, { durable: true });
  channel.consume(queue, (msg) => {
    if (!msg) return;
    try {
      const content = JSON.parse(msg.content.toString());
      handler(content);
      channel.ack(msg);
    } catch (err) {
      console.error('[broker] Failed to process message:', err.message);
      channel.nack(msg, false, false);
    }
  });
  console.log(`[broker] Consuming queue="${queue}"`);
}

function getChannel() {
  return channel;
}

module.exports = { connect, publish, consume, getChannel };

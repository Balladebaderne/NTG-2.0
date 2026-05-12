const amqp = require('amqplib')
const { handleShipmentEvent } = require('./shipment.consumer')

function consumerEnabled() {
  return process.env.LOYALTY_EVENT_CONSUMER_ENABLED === 'true'
}

function connectionTarget() {
  if (process.env.RABBITMQ_URL) return process.env.RABBITMQ_URL

  return {
    hostname: process.env.RABBITMQ_HOST || 'localhost',
    password: process.env.RABBITMQ_PASS || 'guest',
    port: Number(process.env.RABBITMQ_PORT || 5672),
    protocol: 'amqp',
    username: process.env.RABBITMQ_USER || 'guest',
  }
}

async function startShipmentEventConsumer() {
  if (!consumerEnabled()) {
    return { status: 'skipped', reason: 'loyalty event consumer disabled' }
  }

  return startWithRetry(connectShipmentEventConsumer)
}

async function connectShipmentEventConsumer() {
  const exchange = process.env.TRACKING_EVENTS_EXCHANGE || 'tracking.events'
  const queueName = process.env.LOYALTY_EVENTS_QUEUE || 'driver-loyalty.tracking-events'
  const connection = await amqp.connect(connectionTarget())
  const channel = await connection.createChannel()

  await channel.assertExchange(exchange, 'topic', { durable: true })
  const queue = await channel.assertQueue(queueName, { durable: true })

  await channel.bindQueue(queue.queue, exchange, 'shipment.delivered')
  await channel.bindQueue(queue.queue, exchange, 'shipment.intermediate_event')
  await channel.prefetch(10)

  await channel.consume(queue.queue, async (message) => {
    if (!message) return

    try {
      const event = JSON.parse(message.content.toString('utf8'))
      await handleShipmentEvent(event)
      channel.ack(message)
    } catch (err) {
      console.error('Failed to handle tracking event:', err.message)
      channel.nack(message, false, false)
    }
  })

  return { status: 'consuming', queue: queue.queue }
}

async function startWithRetry(connect, {
  logger = console,
  maxAttempts = Infinity,
  retryDelayMs = Number(process.env.LOYALTY_CONSUMER_RETRY_DELAY_MS || 5000),
} = {}) {
  let attempt = 0

  while (attempt < maxAttempts) {
    attempt += 1

    try {
      return await connect()
    } catch (err) {
      if (attempt >= maxAttempts) throw err

      logger.warn(`Driver Loyalty consumer start failed (${err.message}); retrying in ${retryDelayMs}ms`)
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
    }
  }

  return { status: 'skipped', reason: 'max retry attempts reached' }
}

module.exports = { connectShipmentEventConsumer, startShipmentEventConsumer, startWithRetry }

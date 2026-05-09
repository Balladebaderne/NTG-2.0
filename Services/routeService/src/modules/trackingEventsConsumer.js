const amqp = require('amqplib')

const config = require('../config')
const RoutePlan = require('../models/RoutePlan')

async function handleTrackingEvent(event, routingKey) {
  const routeId = event.routeId
  const stopId = event.metadata && event.metadata.stopId

  if (!routeId || !stopId) {
    return { status: 'skipped', reason: 'missing routeId or metadata.stopId' }
  }

  const confirmedAt = event.reportedAt || event.occurredAt || new Date().toISOString()
  const result = await RoutePlan.confirmStop(routeId, stopId, confirmedAt)

  if (!result) {
    return { status: 'skipped', reason: 'route or stop not found' }
  }

  return { status: 'processed', routeId: result.routeId, newStatus: result.status }
}

async function startTrackingEventsConsumer() {
  if (!config.trackingConsumerEnabled) {
    return { status: 'skipped', reason: 'tracking consumer disabled' }
  }

  const connection = await amqp.connect(config.rabbitmqUrl)
  const channel = await connection.createChannel()

  await channel.assertExchange(config.trackingEventsExchange, 'topic', { durable: true })
  const queue = await channel.assertQueue(config.routeProgressQueue, { durable: true })

  await channel.bindQueue(queue.queue, config.trackingEventsExchange, 'shipment.intermediate_event')
  await channel.bindQueue(queue.queue, config.trackingEventsExchange, 'shipment.delivered')
  await channel.prefetch(10)

  await channel.consume(queue.queue, async (message) => {
    if (!message) return

    try {
      const event = JSON.parse(message.content.toString('utf8'))
      await handleTrackingEvent(event, message.fields.routingKey)
      channel.ack(message)
    } catch (err) {
      console.error('route-service: failed to handle tracking event:', err.message)
      channel.nack(message, false, false)
    }
  })

  console.log(`route-service: consuming tracking events from queue "${queue.queue}"`)
  return { status: 'consuming', queue: queue.queue }
}

module.exports = { handleTrackingEvent, startTrackingEventsConsumer }

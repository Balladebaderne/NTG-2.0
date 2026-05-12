const amqp = require('amqplib')

const config = require('../config')
const RoutePlan = require('../models/RoutePlan')

// Maps a published trackingEventType to the stop type(s) it confirms.
// In_transit_milestone can match multiple types — the first unconfirmed one in sequence is chosen.
const STOP_TYPES_BY_EVENT_TYPE = {
  goods_loaded_pickup_confirmed: ['pickup'],
  departed_origin_terminal: ['origin_terminal'],
  in_transit_milestone: ['hub', 'border_crossing'],
  arrived_destination_terminal: ['destination_terminal'],
  goods_delivered: ['delivery'],
  pod_confirmed: ['delivery'],
  shipment_completed_closed: ['delivery'],
}

async function handleTrackingEvent(event, routingKey) {
  const routeId = event.routeId
  if (!routeId) {
    return { status: 'skipped', reason: 'missing routeId' }
  }

  const eventType = event.trackingEventType || event.type
  const stopTypes = STOP_TYPES_BY_EVENT_TYPE[eventType]
  if (!stopTypes) {
    return { status: 'skipped', reason: `no stop mapping for event type "${eventType}"` }
  }

  const confirmedAt = event.occurredAt || event.reportedAt || new Date().toISOString()
  const result = await RoutePlan.confirmNextStopByType(routeId, stopTypes, confirmedAt)

  if (!result) {
    return { status: 'skipped', reason: 'no matching unconfirmed stop found' }
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

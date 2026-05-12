const amqp = require('amqplib')

const BROKER_EVENT_BY_TRACKING_EVENT = {
  goods_delivered: 'delivered',
  pod_confirmed: 'delivered',
  shipment_completed_closed: 'delivered',
  goods_loaded_pickup_confirmed: 'intermediate_event',
  departed_origin_terminal: 'intermediate_event',
  in_transit_milestone: 'intermediate_event',
  arrived_destination_terminal: 'intermediate_event',
  out_for_delivery: 'intermediate_event',
}

let channelPromise = null

function publishingEnabled() {
  return process.env.TRACKING_EVENT_PUBLISHING_ENABLED === 'true'
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

async function getChannel() {
  if (!channelPromise) {
    channelPromise = amqp.connect(connectionTarget())
      .then(async (connection) => {
        connection.on('close', () => {
          channelPromise = null
        })
        connection.on('error', () => {
          channelPromise = null
        })

        const channel = await connection.createChannel()
        await channel.assertExchange(process.env.TRACKING_EVENTS_EXCHANGE || 'tracking.events', 'topic', {
          durable: true,
        })
        return channel
      })
      .catch((err) => {
        channelPromise = null
        throw err
      })
  }

  return channelPromise
}

function brokerEventFromTrackingEvent(event) {
  const trackingEventType = event.canonicalEventType || event.eventType
  const type = BROKER_EVENT_BY_TRACKING_EVENT[trackingEventType]

  if (!type) return null
  if (!event.driverId) return null

  return {
    type,
    eventId: event.trackingEventId,
    trackingEventId: event.trackingEventId,
    trackingEventType,
    shipmentId: event.shipmentId,
    shipmentNumber: event.shipmentNumber || event.shipmentId,
    driverId: event.driverId,
    routeId: event.routeId,
    occurredAt: event.occurredAt,
    idempotencyKey: event.idempotencyKey,
  }
}

async function publishTrackingEvent(event) {
  if (!publishingEnabled()) {
    return { status: 'skipped', reason: 'tracking event publishing disabled' }
  }

  const brokerEvent = brokerEventFromTrackingEvent(event)
  if (!brokerEvent) {
    return { status: 'skipped', reason: 'tracking event is not publishable' }
  }

  try {
    const channel = await getChannel()
    const exchange = process.env.TRACKING_EVENTS_EXCHANGE || 'tracking.events'
    const routingKey = `shipment.${brokerEvent.type}`
    const body = Buffer.from(JSON.stringify(brokerEvent))

    const accepted = channel.publish(exchange, routingKey, body, {
      contentType: 'application/json',
      messageId: brokerEvent.eventId,
      persistent: true,
      timestamp: Math.floor(Date.now() / 1000),
      type: brokerEvent.type,
    })

    return accepted
      ? { status: 'published', routingKey }
      : { status: 'queued', routingKey }
  } catch (err) {
    console.error('Failed to publish tracking event:', err.message)
    return { status: 'failed', reason: err.message }
  }
}

module.exports = {
  BROKER_EVENT_BY_TRACKING_EVENT,
  brokerEventFromTrackingEvent,
  publishTrackingEvent,
}

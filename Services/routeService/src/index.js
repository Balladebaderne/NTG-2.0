const app = require('./app')
const { ensureSchema, pool } = require('./db')
const { startTrackingEventsConsumer } = require('./modules/trackingEventsConsumer')

const PORT = process.env.PORT || 5000

ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`route-service listening on ${PORT}`))
    return startTrackingEventsConsumer().catch((err) => {
      console.error('route-service: tracking consumer failed to start (non-fatal):', err.message)
    })
  })
  .then((consumerResult) => {
    if (consumerResult && consumerResult.status !== 'skipped') {
      console.log('route-service: tracking consumer started', consumerResult)
    }
  })
  .catch((err) => {
    console.error('Route service startup error:', err)
    pool.end().finally(() => process.exit(1))
  })

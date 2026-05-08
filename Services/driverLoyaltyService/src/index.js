require('dotenv').config()
const { createApp } = require('./app')
const { startShipmentEventConsumer } = require('./consumers/rabbitmq.consumer')
const { initDb } = require('./db')

const PORT = process.env.PORT || 5003

async function main() {
  await initDb()
  const app = createApp()
  app.listen(PORT, () =>
    console.log(`Driver Loyalty Service running on port ${PORT}`)
  )

  startShipmentEventConsumer()
    .then((result) => {
      if (result?.status === 'consuming') {
        console.log(`Driver Loyalty consumer listening on ${result.queue}`)
      }
    })
    .catch((err) => {
      console.error('Driver Loyalty consumer failed to start:', err.message)
    })
}

main().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})

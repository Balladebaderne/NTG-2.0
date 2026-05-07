const app = require('./app')
const { startDelayPolling } = require('./services/delayPoller')

const PORT = process.env.PORT || 5002

app.listen(PORT, () => {
  console.log(`notification-service listening on ${PORT}`)
  startDelayPolling()
})

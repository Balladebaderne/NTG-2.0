const express = require('express')

const trackingRouter = require('./routes/tracking')

const app = express()

app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'tracking-service' }))

app.use('/tracking/shipments/:shipmentNumber', trackingRouter)

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Internal server error' })
})

module.exports = app

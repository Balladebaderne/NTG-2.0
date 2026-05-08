const express = require('express')
const pointsRouter = require('./routes/points.routes')

function createApp() {
  const app = express()
  app.use(express.json())

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'driver-loyalty-service' })
  })

  app.use(pointsRouter)

  // Global error handler
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}

module.exports = { createApp }

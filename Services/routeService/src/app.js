const express = require('express')

const routesRouter = require('./routes/routes')

const app = express()

app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'route-service' }))

app.use('/routes', routesRouter)

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Internal server error' })
})

module.exports = app

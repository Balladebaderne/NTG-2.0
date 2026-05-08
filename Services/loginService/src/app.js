const cors = require('cors')
const express = require('express')
const { createAuthRouter } = require('./login/auth.routes')

function createApp({ authService, corsOrigin }) {
  const app = express()

  app.use(cors({ origin: corsOrigin }))
  app.use(express.json())

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'login-service' })
  })

  app.use('/auth', createAuthRouter(authService))

  return app
}

module.exports = { createApp }

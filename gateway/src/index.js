const express = require('express')
const { createAuthProxyRouter } = require('./routes/authProxy')

const app = express()
const PORT = process.env.PORT || 8080
const LOGIN_SERVICE_URL = process.env.LOGIN_SERVICE_URL || 'http://localhost:5001'
const CORS_ORIGINS = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin
  const allowedOrigin = CORS_ORIGINS.includes(requestOrigin) ? requestOrigin : CORS_ORIGINS[0]

  res.header('Access-Control-Allow-Origin', allowedOrigin)
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')

  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }

  next()
})
app.use(express.json())

app.get('/health', (req, res) => res.json({status: 'ok', service: 'gateway'}))
app.use('/auth', createAuthProxyRouter({ loginServiceUrl: LOGIN_SERVICE_URL }))

app.listen(PORT, () => console.log(`Gateway listening on ${PORT}`))

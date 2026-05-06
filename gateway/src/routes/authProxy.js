const express = require('express')

function createAuthProxyRouter({ loginServiceUrl }) {
  const router = express.Router()

  router.post('/login', async (req, res, next) => {
    try {
      const loginResponse = await fetch(`${loginServiceUrl}/auth/login`, {
        body: JSON.stringify(req.body),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      const payload = await loginResponse.json().catch(() => null)
      res.status(loginResponse.status).json(payload)
    } catch (error) {
      next(error)
    }
  })

  router.use((error, req, res, next) => {
    console.error(error)
    res.status(502).json({ message: 'Login service is unavailable.' })
  })

  return router
}

module.exports = { createAuthProxyRouter }

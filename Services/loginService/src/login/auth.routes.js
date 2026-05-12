const express = require('express')

function createAuthRouter(authService) {
  const router = express.Router()

  router.post('/login', async (req, res, next) => {
    try {
      const result = await authService.login({
        email: req.body.email,
        password: req.body.password,
      })

      res.json(result)
    } catch (error) {
      if (error.code === 'INVALID_CREDENTIALS') {
        res.status(401).json({ message: 'Invalid email or password.' })
        return
      }

      next(error)
    }
  })

  router.post('/users', async (req, res, next) => {
    try {
      const result = await authService.createUser({
        actorToken: bearerTokenFrom(req),
        user: req.body,
      })

      res.status(201).json(result)
    } catch (error) {
      if (error.code === 'AUTH_REQUIRED' || error.code === 'INVALID_TOKEN') {
        res.status(401).json({ message: error.message })
        return
      }

      if (error.code === 'FORBIDDEN') {
        res.status(403).json({ message: error.message })
        return
      }

      if (error.code === 'VALIDATION_FAILED') {
        res.status(400).json({ message: error.message })
        return
      }

      if (error.code === 'DUPLICATE_EMAIL' || error.code === 'DUPLICATE_ID') {
        res.status(409).json({ message: 'A user with that email or id already exists.' })
        return
      }

      next(error)
    }
  })

  router.use((error, req, res, next) => {
    console.error(error)
    res.status(500).json({ message: 'Login failed.' })
  })

  return router
}

function bearerTokenFrom(req) {
  const header = req.get('authorization') || ''
  const [scheme, token] = header.split(' ')
  return scheme === 'Bearer' ? token : ''
}

module.exports = { createAuthRouter }

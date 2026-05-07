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

  router.use((error, req, res, next) => {
    console.error(error)
    res.status(500).json({ message: 'Login failed.' })
  })

  return router
}

module.exports = { createAuthRouter }

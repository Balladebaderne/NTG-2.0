const { Router } = require('express')
const { requireAuth, requireDriverSelf } = require('../middleware/auth')
const { getPoints } = require('../db')

const router = Router()

router.get(
  '/drivers/:driverId/points',
  requireAuth,
  requireDriverSelf,
  async (req, res, next) => {
    try {
      const points = await getPoints(req.params.driverId)
      res.json({ driver_id: req.params.driverId, points })
    } catch (err) {
      next(err)
    }
  }
)

module.exports = router

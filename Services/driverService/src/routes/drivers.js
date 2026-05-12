const express = require('express')
const router = express.Router()
const pool = require('../db')
const {
  requireAvailabilityWriteAuth,
  requireOperatorWriteAuth,
} = require('../middleware/requireWriteAuth')

// GET /drivers — list all, optionally filter by availability
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM drivers ORDER BY name'
    const params = []
    if (req.query.available !== undefined) {
      query = 'SELECT * FROM drivers WHERE available = $1 ORDER BY name'
      params.push(req.query.available === 'true')
    }
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /drivers/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM drivers WHERE id = $1', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Driver not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /drivers — register a new driver
router.post('/', requireOperatorWriteAuth, async (req, res) => {
  const { name, email, phone } = req.body
  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'name, email, and phone are required' })
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO drivers (name, email, phone)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, email, phone]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' })
    res.status(400).json({ error: err.message })
  }
})

// PUT /drivers/:id — update driver profile (name, email, phone)
router.put('/:id', requireOperatorWriteAuth, async (req, res) => {
  const { name, email, phone } = req.body
  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'name, email, and phone are required' })
  }
  try {
    const { rows } = await pool.query(
      `UPDATE drivers
       SET name = $1, email = $2, phone = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, email, phone, req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Driver not found' })
    res.json(rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' })
    res.status(400).json({ error: err.message })
  }
})

// PATCH /drivers/:id/availability — toggle DriverAvailability
router.patch('/:id/availability', requireAvailabilityWriteAuth, async (req, res) => {
  const { available } = req.body
  if (typeof available !== 'boolean') {
    return res.status(400).json({ error: '"available" must be a boolean' })
  }
  try {
    const { rows } = await pool.query(
      `UPDATE drivers
       SET available = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [available, req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Driver not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /drivers/:id
router.delete('/:id', requireOperatorWriteAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM drivers WHERE id = $1 RETURNING id', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Driver not found' })
    res.json({ message: 'Driver deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

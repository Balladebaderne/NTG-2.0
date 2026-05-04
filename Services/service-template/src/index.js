const express = require('express')
const { Pool } = require('pg')
const app = express()
const PORT = process.env.PORT || 5000

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || null,
})

app.get('/health', (req, res) => res.json({status: 'ok', service: 'service-template'}))

app.get('/items', async (req, res) => {
  try {
    const r = await pool.query('SELECT NOW() as now')
    res.json({items: [], db_time: r.rows[0].now})
  } catch (err) {
    res.status(500).json({error: err.message})
  }
})

app.listen(PORT, () => console.log(`Service-template listening on ${PORT}`))

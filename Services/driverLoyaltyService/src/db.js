const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS driver_points (
      driver_id TEXT PRIMARY KEY,
      points    INTEGER NOT NULL DEFAULT 0
    )
  `)
}

async function getPoints(driverId) {
  const { rows } = await pool.query(
    'SELECT points FROM driver_points WHERE driver_id = $1',
    [driverId]
  )
  return rows[0]?.points ?? 0
}

async function addPoints(driverId, amount) {
  await pool.query(
    `INSERT INTO driver_points (driver_id, points)
     VALUES ($1, $2)
     ON CONFLICT (driver_id)
     DO UPDATE SET points = driver_points.points + EXCLUDED.points`,
    [driverId, amount]
  )
}

module.exports = { initDb, getPoints, addPoints }

const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS driver_points (
      driver_id TEXT PRIMARY KEY,
      points    INTEGER NOT NULL DEFAULT 0
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS driver_point_events (
      event_id       TEXT PRIMARY KEY,
      driver_id      TEXT NOT NULL,
      event_type     TEXT NOT NULL,
      points_awarded INTEGER NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

async function addPointsForEvent(driverId, amount, eventId, eventType) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const eventInsert = await client.query(
      `INSERT INTO driver_point_events (event_id, driver_id, event_type, points_awarded)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [eventId, driverId, eventType, amount]
    )

    if (eventInsert.rowCount === 0) {
      await client.query('COMMIT')
      return { awarded: false, reason: 'duplicate event' }
    }

    await client.query(
      `INSERT INTO driver_points (driver_id, points)
       VALUES ($1, $2)
       ON CONFLICT (driver_id)
       DO UPDATE SET points = driver_points.points + EXCLUDED.points`,
      [driverId, amount]
    )

    await client.query('COMMIT')
    return { awarded: true, pointsAwarded: amount }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { initDb, getPoints, addPoints, addPointsForEvent }

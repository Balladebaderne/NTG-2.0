const app = require('./app')
const { ensureSchema, pool } = require('./db')

const PORT = process.env.PORT || 5000

ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`Tracking service listening on ${PORT}`))
  })
  .catch(err => {
    console.error('Tracking service startup error:', err)
    pool.end().finally(() => process.exit(1))
  })

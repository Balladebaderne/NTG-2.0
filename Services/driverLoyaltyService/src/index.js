require('dotenv').config()
const { createApp } = require('./app')
const { initDb } = require('./db')

const PORT = process.env.PORT || 5003

async function main() {
  await initDb()
  const app = createApp()
  app.listen(PORT, () =>
    console.log(`Driver Loyalty Service running on port ${PORT}`)
  )
}

main().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})

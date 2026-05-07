const express = require('express')
const notificationsRouter = require('./routes/notifications')

const app = express()

app.use(express.json())
app.use('/notifications', notificationsRouter)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' })
})

module.exports = app

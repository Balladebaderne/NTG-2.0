const express = require('express')
const app = express()

app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'customer-support-service' }))

const ticketsRouter = require('./routes/tickets')
const searchRouter = require('./routes/search')

app.use('/tickets', ticketsRouter)
app.use('/search', searchRouter)

module.exports = app

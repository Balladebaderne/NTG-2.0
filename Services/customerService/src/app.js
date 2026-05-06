const express = require('express')
const app = express()

app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'customer-service' }))

const customersRouter = require('./routes/customers')
const shipmentsRouter = require('./routes/shipments')

app.use('/customers', customersRouter)
app.use('/customers', shipmentsRouter)

module.exports = app

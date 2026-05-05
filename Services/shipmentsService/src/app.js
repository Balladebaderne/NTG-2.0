const express = require('express')
const app = express()

app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'shipments-service' }))

const shipmentsRouter = require('./routes/shipments')
const goodsRouter = require('./routes/goods')
const itemsRouter = require('./routes/items')

app.use('/shipments', shipmentsRouter)
app.use('/shipments/:id/goods', goodsRouter)
app.use('/shipments/:id/goods/:goodsId/items', itemsRouter)

module.exports = app

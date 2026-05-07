const express = require('express')
const app = express()
const PORT = process.env.PORT || 5001

app.use(express.json())

const driversRouter = require('./routes/drivers')
app.use('/drivers', driversRouter)

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'driver-service' }))

app.listen(PORT, () => console.log(`driver-service listening on ${PORT}`))

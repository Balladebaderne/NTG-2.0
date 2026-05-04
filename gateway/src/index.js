const express = require('express')
const app = express()
const PORT = process.env.PORT || 8080

app.use(express.json())

app.get('/health', (req, res) => res.json({status: 'ok', service: 'gateway'}))

app.listen(PORT, () => console.log(`Gateway listening on ${PORT}`))

const mongoose = require('mongoose')
const app = require('./app')

const PORT = process.env.PORT || 5002
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/customer_support_db'

mongoose.connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Customer support service listening on ${PORT}`))
  })
  .catch(err => {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  })

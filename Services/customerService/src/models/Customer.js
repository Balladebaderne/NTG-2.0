const mongoose = require('mongoose')
const { v4: uuidv4 } = require('uuid')

const CustomerSchema = new mongoose.Schema({
  customerId: { type: String, default: uuidv4, unique: true },
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  phone:      { type: String, default: null },
  company:    { type: String, default: null },
}, { timestamps: true })

module.exports = mongoose.model('Customer', CustomerSchema)

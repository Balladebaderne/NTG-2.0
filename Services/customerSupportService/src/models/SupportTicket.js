const mongoose = require('mongoose')
const { v4: uuidv4 } = require('uuid')

const SupportTicketSchema = new mongoose.Schema({
  ticketId:    { type: String, default: uuidv4, unique: true },
  shipmentId:  { type: String, required: true },
  customerId:  { type: String, required: true },
  agentId:     { type: String, required: true },
  subject:     { type: String, required: true },
  description: { type: String, required: true },
  status:      { type: String, enum: ['open', 'in_progress', 'resolved', 'escalated'], default: 'open' },
}, { timestamps: true })

module.exports = mongoose.model('SupportTicket', SupportTicketSchema)

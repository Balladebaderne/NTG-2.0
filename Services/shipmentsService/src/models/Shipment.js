const mongoose = require('mongoose')
const { v4: uuidv4 } = require('uuid')

const ItemSchema = new mongoose.Schema({
  itemId:      { type: String, default: uuidv4 },
  description: { type: String, required: true },
  weightKg:    { type: Number, required: true },
  volumeM3:    { type: Number, required: true },
}, { _id: false })

const GoodsSchema = new mongoose.Schema({
  goodsId:       { type: String, default: uuidv4 },
  totalWeightKG: { type: Number, required: true },
  totalVolumeM3: { type: Number, required: true },
  items:         { type: [ItemSchema], default: [] },
}, { _id: false })

const ShipmentSchema = new mongoose.Schema({
  status:                    { type: String, enum: ['booked', 'in_transit', 'received'], default: 'booked' },
  senderId:                  { type: String, required: true },
  receiverCustomerId:        { type: String, required: true },
  createdByCustomerServiceId:{ type: String, required: true },
  routeId:                   { type: String, default: null },
  goods:                     { type: [GoodsSchema], default: [] },
}, { timestamps: true })

module.exports = mongoose.model('Shipment', ShipmentSchema)

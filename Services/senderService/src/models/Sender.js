const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const AddressSchema = new mongoose.Schema(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false }
);

const SenderSchema = new mongoose.Schema(
  {
    senderId: { type: String, default: uuidv4, unique: true },
    type: { type: String, enum: ['shipper', 'consignee'], required: true },
    name: { type: String, required: true },
    company: { type: String },
    email: { type: String, required: true },
    phone: { type: String },
    address: { type: AddressSchema, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sender', SenderSchema);

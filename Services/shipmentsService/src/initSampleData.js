// src/initSampleData.js
// Inserts sample shipment data for development/testing

const mongoose = require('mongoose');
const Shipment = require('./models/Shipment');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipments_db';

const sampleShipments = [
  {
    senderId: 'sender-1',
    receiverCustomerId: 'customer-1',
    createdByCustomerServiceId: 'agent-1',
    status: 'booked',
    goods: [
      {
        totalWeightKG: 100,
        totalVolumeM3: 2.5,
        items: [
          { description: 'Widget A', weightKg: 50, volumeM3: 1.2 },
          { description: 'Widget B', weightKg: 50, volumeM3: 1.3 }
        ]
      }
    ]
  },
  {
    senderId: 'sender-2',
    receiverCustomerId: 'customer-2',
    createdByCustomerServiceId: 'agent-2',
    status: 'in_transit',
    goods: [
      {
        totalWeightKG: 200,
        totalVolumeM3: 4.0,
        items: [
          { description: 'Gadget X', weightKg: 120, volumeM3: 2.0 },
          { description: 'Gadget Y', weightKg: 80, volumeM3: 2.0 }
        ]
      }
    ]
  }
];

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
  await Shipment.deleteMany({});
  await Shipment.insertMany(sampleShipments);
  console.log('Sample shipments inserted.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

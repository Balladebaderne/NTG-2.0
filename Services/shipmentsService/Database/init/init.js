// Switch to shipments_db
db = db.getSiblingDB("shipments_db");

// Create collection with validation
db.createCollection("shipments");

// Clear existing data
db.shipments.deleteMany({});

// Insert sample shipments
db.shipments.insertMany([
  {
    senderId: "sender-1",
    receiverCustomerId: "customer-1",
    createdByCustomerServiceId: "agent-1",
    status: "booked",
    goods: [
      {
        totalWeightKG: 100,
        totalVolumeM3: 2.5,
        items: [
          { description: "Widget A", weightKg: 50, volumeM3: 1.2 },
          { description: "Widget B", weightKg: 50, volumeM3: 1.3 }
        ]
      }
    ]
  },
  {
    senderId: "sender-2",
    receiverCustomerId: "customer-2",
    createdByCustomerServiceId: "agent-2",
    status: "in_transit",
    goods: [
      {
        totalWeightKG: 200,
        totalVolumeM3: 4.0,
        items: [
          { description: "Gadget X", weightKg: 120, volumeM3: 2.0 },
          { description: "Gadget Y", weightKg: 80, volumeM3: 2.0 }
        ]
      }
    ]
  }
]);


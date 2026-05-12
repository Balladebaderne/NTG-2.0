// Switch to shipments_db
db = db.getSiblingDB("shipments_db");

// Create collection with validation
db.createCollection("shipments");

// Clear existing data
db.shipments.deleteMany({});

// Insert sample shipments.
// Fixed _id values so the route_db init can reference them by shipment_id.
//   111111111111111111111111 → route-plan-001 (planned, CPH → Hamburg)
//   222222222222222222222222 → route-plan-002 (active,  Aarhus → Berlin)
db.shipments.insertMany([
  {
    _id: ObjectId("111111111111111111111111"),
    senderId: "sender-1",
    receiverCustomerId: "customer-1",
    createdByCustomerServiceId: "agent-1",
    status: "booked",
    routeId: "route-plan-001",
    estimatedArrivalAt: new Date(Date.now() + 30 * 60 * 60 * 1000),
    originAddress: {
      street: "Rådhuspladsen 1",
      city: "Copenhagen",
      postalCode: "1550",
      country: "Denmark"
    },
    destinationAddress: {
      street: "Reeperbahn 1",
      city: "Hamburg",
      postalCode: "20359",
      country: "Germany"
    },
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
    _id: ObjectId("222222222222222222222222"),
    senderId: "sender-2",
    receiverCustomerId: "customer-2",
    createdByCustomerServiceId: "agent-2",
    status: "in_transit",
    routeId: "route-plan-002",
    estimatedArrivalAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    originAddress: {
      street: "Store Torv 4",
      city: "Aarhus",
      postalCode: "8000",
      country: "Denmark"
    },
    destinationAddress: {
      street: "Unter den Linden 1",
      city: "Berlin",
      postalCode: "10117",
      country: "Germany"
    },
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

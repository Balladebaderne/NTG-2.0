// Switch to shipments_db
db = db.getSiblingDB("shipments_db");

// Create collection with validation
db.createCollection("shipments");

// Clear existing data
db.shipments.deleteMany({});

// No sample shipments — collection starts empty.

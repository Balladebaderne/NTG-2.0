# Tracking

Tracking records what happens to a Shipment over time after it has been booked.

## Language

**Tracking Event**:
A timestamped fact about a Shipment's transport progress.
_Avoid_: Log entry, update, notification

**Location Update**:
A Tracking Event that records the latest known coordinates for a Shipment.
_Avoid_: Map point, GPS row, ping

**Latest Tracking State**:
The current tracking summary derived from the most recent Tracking Events.
_Avoid_: Shipment status, current shipment, live map

**Milestone Event**:
A Tracking Event that changes the Shipment lifecycle status.
_Avoid_: Status update, lifecycle command

**Shipment Reference**:
The `shipmentId` used by Tracking to refer to a Shipment owned by shipmentsService.
_Avoid_: Shipment copy, shipment record

## Relationships

- A **Shipment Reference** points to exactly one Shipment owned by shipmentsService
- A **Shipment Reference** has zero or more **Tracking Events**
- A **Location Update** is a kind of **Tracking Event**
- A **Latest Tracking State** is derived from the newest relevant **Tracking Events**
- A **Milestone Event** may request a Shipment lifecycle status change from shipmentsService

## Example Dialogue

> **Dev:** "Should Tracking store the Goods and Items so the map can show what is inside the Shipment?"
> **Domain expert:** "No. Tracking only needs the Shipment Reference and transport progress. Goods and Items remain in shipmentsService."

## Flagged Ambiguities

- "Tracking status" can mean either the Shipment lifecycle `status` or the event history shown to users. Resolved: Shipment lifecycle status stays in shipmentsService; Tracking Events stay in trackingService.
- "Map location" can mean rendered map tiles or stored coordinates. Resolved: trackingService stores coordinates; the frontend renders the map.

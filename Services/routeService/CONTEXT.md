# Routing

Routing records the planned movement for a Shipment before and during transport execution.

## Language

**Route Plan**:
A planned journey for one Shipment from origin to destination through ordered Stops.
_Avoid_: Tracking, trip log, delivery history

**Stop**:
A planned place in a Route Plan where the Shipment may be picked up, transferred, checked, or delivered.
_Avoid_: Tracking Event, GPS point

**Origin**:
The planned starting place for a Route Plan.
_Avoid_: Sender record

**Destination**:
The planned final delivery place for a Route Plan.
_Avoid_: ReceiverCustomer record

**Route Geometry**:
Calculated map drawing data for a Route Plan, stored as an encoded polyline with provider metadata.
_Avoid_: Live GPS trace, tracking event stream

**Shipment Reference**:
The Mongo `_id` used by Route Service to refer to a Shipment owned by shipmentsService.
_Avoid_: Shipment copy, Shipment aggregate

## Relationships

- A **Route Plan** belongs to exactly one **Shipment Reference**
- A **Route Plan** has one **Origin** and one **Destination**
- A **Route Plan** has two or more **Stops**
- A **Stop** belongs to exactly one **Route Plan**
- A **Route Plan** may have one calculated **Route Geometry**
- A **Stop** may later be referenced by Tracking through route metadata

## Example Dialogue

> **Dev:** "Should Routing store GPS updates from the driver?"
> **Domain expert:** "No. Routing stores the planned Stops. Tracking stores what actually happened."

## Flagged Ambiguities

- "route status" means the state of the planned Route Plan (`planned`, `active`, `completed`, `cancelled`), not the Shipment lifecycle status.
- "location" in Routing means planned coordinates for an Origin, Destination, or Stop; live location belongs to Tracking.
- Google route calculation enriches the Route Plan. It does not replace tracking updates from drivers.

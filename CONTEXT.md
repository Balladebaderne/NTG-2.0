# NTG

NTG is a freight and parcel logistics platform that coordinates the movement of goods from senders to customers via truck drivers on planned routes.

## Language

**Shipment**:
A wrapper around a collection of Goods being transported from a Sender to a ReceiverCustomer by a Driver along a Route.
_Avoid_: Order, delivery, package, consignment

**Goods**:
A grouping of Items within a Shipment, with an aggregate weight and volume.
_Avoid_: Package, parcel, box, cargo

**Item**:
A single physical article within a Goods grouping, described by weight and volume.
_Avoid_: Product, unit, thing, object

**Sender**:
The party that hands over Goods for transportation.
_Avoid_: Shipper, origin, supplier

**ReceiverCustomer**:
The party that receives the Goods at the destination.
_Avoid_: Recipient, consignee, buyer, customer (without qualifier)

**Driver**:
The truck driver responsible for picking up and transporting a Shipment. An independent agent who registers in the system, logs in, and toggles their availability. Assignment to a Shipment is done by a **CustomerSupportAgent**.
_Avoid_: Courier, carrier, transporter

**DriverAvailability**:
A Driver's self-reported readiness to accept Shipment assignments. A Driver is either available or unavailable. CustomerSupportAgents assign Shipments from the pool of available Drivers.
_Avoid_: Status, online, active

**Route**:
A customer-facing visualization of the path a Shipment will travel, exposed to CustomerService and CustomerSupportService. Not used by the Driver to navigate — Drivers use their own external routing system (out of scope).
_Avoid_: Trip, journey, path, driver assignment

**EstimatedArrival**:
The time NTG expects a Shipment to arrive at the ReceiverCustomer.
_Avoid_: ETA (without defining it), delivery time, route time

**Delay**:
A Shipment condition where the Shipment is no longer expected to arrive when the ReceiverCustomer was told to expect it.
_Avoid_: Late status, problem, exception

**Notification**:
A customer-facing message sent to a ReceiverCustomer about a Shipment that needs their attention.
_Avoid_: Alert, email, message (without qualifier)

**CustomerSupportAgent**:
A platform operator who books Shipments on behalf of Senders and ReceiverCustomers, and assigns available Drivers to unassigned Shipments.
_Avoid_: Operator, admin, dispatcher

**LoyaltyPoints**:
A Driver's accumulated score on the platform, earned by delivering Shipments and reporting intermediate tracking events. Stored as a running total per Driver. A Driver can only view their own LoyaltyPoints; admin and support roles can view any Driver's total.
_Avoid_: Reward points, credits, score

**IntermediateEvent**:
A Shipment status change that is not the final delivery (i.e. not `received`), used as a trigger for awarding a smaller number of LoyaltyPoints to the assigned Driver. Originates from the trackingService via the message broker.
_Avoid_: Status update, tracking event, partial event

## Relationships

- A **Shipment** is created by a **CustomerSupportAgent** on behalf of a **Sender** and a **ReceiverCustomer**
- A **Shipment** contains one or more **Goods**
- A **Goods** contains one or more **Items**
- A **Route** is associated with a **Shipment** for customer-facing visualization
- A **Driver** is assigned directly to a **Shipment** (not through a Route)
- A **Shipment** has zero or one **EstimatedArrival**
- A **Delay** belongs to one **Shipment**
- A **Notification** is sent to one **ReceiverCustomer** about one **Shipment**

## Shipment lifecycle

`booked` → `in_transit` → `received`

- **booked**: Shipment has been registered; not yet picked up
- **in_transit**: Driver has picked up the Goods and is en route
- **received**: ReceiverCustomer has confirmed receipt

## Example dialogue

> **Dev:** "When a Driver marks themselves available, do they get assigned automatically?"
> **Domain expert:** "No — a Driver toggles their DriverAvailability. A CustomerSupportAgent then picks an available Driver and assigns them directly to a Shipment. The Route on a Shipment is for customer visualization only — it has nothing to do with the Driver assignment."

## Flagged ambiguities

- "customer" was used to mean both Sender and ReceiverCustomer — resolved: these are distinct roles. Use **Sender** for the originating party and **ReceiverCustomer** for the destination party.
- "items" was initially used to mean the goods inside a Shipment — resolved: **Item** is the leaf-level entity, **Goods** is the grouping, **Shipment** is the top-level wrapper.
- "Route" was initially defined as the path a Driver follows — resolved: **Route** is a customer-facing visualization concept only. Drivers use their own external navigation (out of scope). A Driver is assigned directly to a **Shipment**, not through a Route.

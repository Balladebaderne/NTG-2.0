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
The truck driver responsible for picking up and transporting a Shipment.
_Avoid_: Courier, carrier, transporter

**Route**:
The planned path a Driver follows to fulfil one or more Shipments.
_Avoid_: Trip, journey, path

## Relationships

- A **Shipment** is created by a **CustomerSupportAgent** on behalf of a **Sender** and a **ReceiverCustomer**
- A **Shipment** contains one or more **Goods**
- A **Goods** contains one or more **Items**
- A **Shipment** is assigned to a **Route**
- A **Driver** is assigned to a **Route**

## Shipment lifecycle

`booked` → `in_transit` → `received`

- **booked**: Shipment has been registered; not yet picked up
- **in_transit**: Driver has picked up the Goods and is en route
- **received**: ReceiverCustomer has confirmed receipt

## Example dialogue

> **Dev:** "When a Sender books a Shipment, do we assign a Driver immediately?"
> **Domain expert:** "No — the Shipment is booked first. A Route is assigned separately, and the Driver is associated with the Route, not directly with the Shipment."

## Flagged ambiguities

- "customer" was used to mean both Sender and ReceiverCustomer — resolved: these are distinct roles. Use **Sender** for the originating party and **ReceiverCustomer** for the destination party.
- "items" was initially used to mean the goods inside a Shipment — resolved: **Item** is the leaf-level entity, **Goods** is the grouping, **Shipment** is the top-level wrapper.

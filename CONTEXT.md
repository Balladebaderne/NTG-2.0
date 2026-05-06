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

# NTG Login Context

The login context authenticates operational users and issues signed tokens that can later be accepted by the API gateway and protected API endpoints.

## Language

**Login Domain**:
The bounded area responsible for validating user credentials and issuing authentication tokens.
_Avoid_: Auth UI, gateway login

**User**:
A person who can authenticate with an email, password, and operational role.
_Avoid_: Account

**Role**:
The operational access category assigned to a user.
_Avoid_: Permission group

**JWT**:
A signed authentication token issued by the **Login Domain** after a successful login.
_Avoid_: Demo token, session id

**Login User File**:
A JSON file owned by the **Login Domain** that contains the users accepted by `POST /auth/login`.
_Avoid_: Frontend login data

## Relationships

- A **User** has exactly one **Role**
- The **Login User File** contains the current **Users** for the login domain
- The **Login Domain** issues one **JWT** for a successful login
- Traefik routes `POST /auth/login` to the **Login Domain**
- Future gateway middleware will verify the **JWT** before allowing access to protected endpoints

## Example dialogue

> **Dev:** "Should the frontend create the token when a Driver signs in?"
> **Domain expert:** "No. The Login Domain validates the Driver's credentials and returns the JWT."

## Flagged ambiguities

- Python `app.py` service files were accidental scaffolding; the intended service stack is React, Node.js, and Express.
- Credentials are checked against the login service JSON user file.

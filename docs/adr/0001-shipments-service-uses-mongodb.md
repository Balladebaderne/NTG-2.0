# shipmentsService uses MongoDB

The shipmentsService owns the `Shipment → Goods → Items` aggregate. A Shipment contains a variable number of Goods, and each Goods grouping contains a variable number of Items — a variable-depth nested document structure. We chose MongoDB over PostgreSQL because the document model maps directly onto this hierarchy without the impedance mismatch of foreign-key joins across three tables. All other services in NTG 2.0 use PostgreSQL; this is an intentional exception scoped to the domain that requires it.

## Considered Options

- **PostgreSQL with JSONB** — keeps the stack uniform; JSONB can store variable-length arrays. Rejected because querying into deeply nested structures via JSONB operators is significantly more complex than Mongoose document access, and the domain model is inherently document-shaped.
- **MongoDB** — chosen. Document model matches the aggregate naturally; Mongoose provides schema validation at the application layer.

## Consequences

Future services that need to reference Shipment data will do so by `shipmentId` only; they must not query the MongoDB instance directly. Cross-service data access goes through the shipmentsService API.

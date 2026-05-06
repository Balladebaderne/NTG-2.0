# trackingService uses PostgreSQL

Tracking data is append-heavy, queryable by `shipmentId` and time, and does not need the nested document shape that made MongoDB useful for shipmentsService. PostgreSQL is the recommended database for trackingService because it matches the event table model and keeps this service aligned with the default NTG service stack.

## Considered Options

- **MongoDB**: rejected because Tracking Events are flat, time-ordered records rather than a nested aggregate.
- **PostgreSQL**: chosen because the core queries are relational and chronological.

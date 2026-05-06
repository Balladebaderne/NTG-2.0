# Driver is assigned directly to a Shipment, not through a Route

A Driver is stored as a `driverId` reference directly on the Shipment document. There is no intermediary Route object linking Driver to Shipment for assignment purposes.

The `Route` concept in NTG 2.0 is scoped to customer-facing visualization (the path shown to CustomerService and CustomerSupportService), not to Driver assignment. Drivers navigate using their own external routing tools (out of scope). Conflating Route with Driver assignment would overload the concept and require changes to the customer-facing Route API every time a Driver assignment changes.

## Consequences

The `Shipment` model gains a `driverId` field (nullable until assigned). The `routeId` field on Shipment remains for customer-facing visualization only. Services that need to find available Drivers query `driverService`; services that need to know which Driver is on a Shipment read `driverId` directly from the Shipment.

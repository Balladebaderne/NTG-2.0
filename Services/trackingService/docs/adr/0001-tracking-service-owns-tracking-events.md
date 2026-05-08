# trackingService owns Tracking Events

The trackingService owns Tracking Events and Latest Tracking State while shipmentsService remains the owner of Shipment, Goods, Items, and current Shipment lifecycle status. Other services reference a Shipment by `shipmentId` only, so trackingService verifies Shipment existence through the shipmentsService API and must not query the shipments MongoDB database directly.

## Consequences

Tracking history can evolve independently from the nested Shipment aggregate, but lifecycle milestone events such as `picked_up` and `received` need an explicit status sync back to shipmentsService.

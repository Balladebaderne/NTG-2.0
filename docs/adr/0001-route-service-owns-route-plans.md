# routeService owns Route Plans

routeService owns planned movement for Shipments: origin, destination, ordered stops, planned times, ETA, and driver/carrier assignment references. Shipments remain owned by shipmentsService, and actual progress remains owned by trackingService, so routeService references those contexts by id instead of copying their aggregates.

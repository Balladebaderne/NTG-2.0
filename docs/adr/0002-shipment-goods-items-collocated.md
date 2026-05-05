# Goods and Items are collocated within shipmentsService

Goods and Items are logically sub-entities of a Shipment. They could theoretically be modelled as separate microservices (a GoodsService and an ItemsService), but they are inherently data-coupled: a Good has no meaning outside a Shipment, and an Item has no meaning outside a Good. Separating them into independent services would require cross-service joins on every read, create distributed transaction problems on every write, and produce no independent deployability benefit since their lifecycles are identical to the Shipment's. We therefore keep Goods and Items within the shipmentsService boundary, stored as embedded subdocuments in the Shipment MongoDB document, and expose them via nested REST sub-routes (`/shipments/:id/goods`, `/shipments/:id/goods/:goodsId/items`).

## Consequences

If NTG later needs to operate on Goods or Items independently of Shipments (e.g., a standalone inventory system), this boundary will need to be revisited. That cost is accepted as unlikely given the current domain model.

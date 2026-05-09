# routeService uses PostgreSQL

Route Plans are structured records with ordered Stops and query needs by `shipmentId`, `routeId`, and status. PostgreSQL fits this relational shape and matches the existing Node/Postgres service style used by other operational NTG services.

# Full Codebase Integration Review And Bridging Plan

Date: 2026-05-08

## Skill Guidance Applied

This review was redone using the repo-local engineering skill files under `.github/skills/engineering`.

`grill-with-docs` was applied by:

- checking the root `CONTEXT.md` domain language against actual service code
- checking root ADRs against actual implementation
- separating domain terms from implementation mechanics
- surfacing contradictions instead of hiding them
- preferring small documented bridge steps over a rewrite

`UI-SKILL` was applied by:

- checking whether the existing frontend supports the user-facing workflows the backend services imply
- calling out missing visible feedback, navigation, and dashboard flows
- keeping accessibility, form feedback, responsive behavior, and service status visibility in the implementation plan
- treating integration as something that must be verifiable by users, not only by containers starting

This file is a practical implementation guide. It does not replace the architecture, remove Traefik, or merge services.

## What Is Currently Happening

NTG 2.0 currently has a working microservice direction, but the services are at uneven integration maturity.

The core domain shape is clear:

- `shipmentsService` owns the Shipment aggregate.
- `shipmentsService` stores Goods and Items inside Shipment documents.
- `trackingService` owns operational tracking event history.
- `routeService` owns planned routes, stops, ETA, distance, and route geometry.
- `driverService` owns driver profiles and availability.
- `loginService` issues JWTs.
- `notificationService` creates in-app notifications and polls delayed Shipments.
- `senderService`, `customerService`, `customerSupportService`, and `aiChatService` read Shipment data for their own views.
- RabbitMQ and `messageBroker` exist, but event integration is not wired yet.
- The frontend currently supports login and a signed-in placeholder only.

The current runtime problem is not that the services are conceptually wrong. The problem is that several implemented services are not reachable through the same Compose networks and Traefik gateway, and some services expect API behavior that `shipmentsService` does not currently provide.

## Current Codebase Reality

| Area | Current Reality |
|---|---|
| API gateway | Traefik is the chosen gateway. `traefik/traefik.yml` uses Docker labels and `exposedByDefault=false`. |
| Compose | Some services are wired, some are not. `routeService`, `customerService`, and `customerSupportService` are implemented but missing from Compose. |
| Frontend | React/Vite app has login and a placeholder dashboard. It does not yet consume shipments, routes, tracking, notifications, senders, customers, drivers, support tickets, or chat. |
| Auth | `loginService` issues JWTs from static users. Only `driverLoyaltyService` currently validates JWTs inline. |
| Shipment reference | Mongo `_id` is the practical public Shipment reference used by tracking and route services. |
| Eventing | RabbitMQ and `messageBroker` exist. No domain service currently publishes or consumes through it at runtime. |
| Observability | Health endpoints are inconsistent. No shared request id, trace id, or common error contract exists. |

## Service Status Matrix

| Service | What It Currently Does | Current Routes | Compose/Gateway State | Main Gap |
|---|---|---|---|---|
| `shipmentsService` | Owns Shipment, Goods, Items. | `/health`, `/shipments`, nested goods/items routes | In Compose and Traefik at `/shipments` | Missing `driverId`; `GET /shipments` lacks filters expected by callers. |
| `trackingService` | Stores tracking event flow and latest tracking status/location. | `/health`, `/tracking/shipments/:shipmentNumber`, `/latest`, `/status`, `/events`, `/location` | In Compose and Traefik at `/tracking` | Does not publish events to broker; `location_updated` is not fully telemetry-only in code. |
| `routeService` | Stores route plans/stops and Google route geometry; syncs `routeId` and ETA to Shipment. | `/health`, `/routes` CRUD | Implemented but not in Compose or Traefik | Needs `route-service`, `route_db`, `/routes` gateway route, env vars. |
| `driverService` | Stores driver profiles and availability. | `/health`, `/drivers`, `/drivers/:id/availability` | In Compose and Traefik at `/drivers` | No auth, no tests, no driver assignment flow into Shipment. |
| `driverLoyaltyService` | Stores driver points and has a stub shipment event handler. | `/drivers/:driverId/points` | In Compose and Traefik with a specific `/drivers/:id/points` rule | No `/health`; no broker consumer startup; identity id and driver profile id are not aligned. |
| `loginService` | Issues JWTs from static users. | `/auth/login` | In Compose and Traefik at `/auth` | No `/health`; ADR calls it `identityService`, but code/Compose call it `loginService`. |
| `notificationService` | Stores notifications and polls shipments for delays. | `/health`, `/notifications`, `/notifications/scan-delays`, `/notifications/:id/read` | In Compose and Traefik at `/notifications` | No event consumer; top-level volume declaration is incomplete. |
| `senderService` | Stores senders and reads sender shipments. | `/health`, `/senders`, `/senders/:id/shipments` | In Compose with direct host port only | Not on shared networks; no Traefik route; calls a service name it cannot currently reach. |
| `customerService` | Stores customers and reads customer shipment views. | `/health`, `/customers`, customer shipment/delay/stats routes | Not in Compose | Needs DB, network, Traefik route, docs, and real shipment query contract. |
| `customerSupportService` | Stores tickets and support shipment search views. | `/health`, `/tickets`, `/search/*` | Not in Compose | Needs DB, network, Traefik routes, docs, and corrected tracking/search semantics. |
| `aiChatService` | Stores conversations and injects Shipment context into Anthropic prompts. | `/health`, `/chat`, `/conversations` | In Compose with direct host port only | Not on shared networks; no Traefik route; no shipment call timeout; frontend not wired to it. |
| `service-template` | Generic template service. | `/health`, `/items` | Not in Compose, but root README mentions `/items` | Should stay out of product integration unless intentionally used. |
| `messageBroker` | Connects to RabbitMQ and exposes broker health. | `/health` | In Compose on broker network | No domain service uses it yet. |
| `frontend` | Login and placeholder dashboard. | Browser routes `/login`, `/dashboard` | In Compose and Traefik at `/` | Needs actual operational screens and API clients. |

## Domain And ADR Cross-Check

The important `grill-with-docs` finding is that the docs and code mostly agree on service boundaries, but several decisive terms are not yet implemented consistently.

| Domain Decision | Documented In | Code Reality | Required Fix |
|---|---|---|---|
| Shipment is the central aggregate. | `CONTEXT.md`, ADR-0001, ADR-0002 | Implemented in `shipmentsService`. | Keep it. Do not split Goods/Items. |
| Other services must not read `shipments_db` directly. | ADR-0001 | Current service calls use HTTP, not direct DB access. | Keep this rule. Add missing HTTP filters instead of DB sharing. |
| Route is customer-facing visualization, not driver navigation. | `CONTEXT.md`, ADR-0005 | `routeService` owns planned route data. | Keep `routeService.assignedDriverId` as metadata only unless ADR changes. |
| Driver is assigned directly to Shipment. | ADR-0005 | `Shipment.js` does not contain `driverId`. | Add nullable `driverId` to Shipment or update the ADR if the decision changed. |
| Identity service handles auth. | ADR-0004 | Actual service is `loginService`; no service named `identityService`. | Either rename docs to `loginService` for this project or add a new identity service later. |
| Loyalty points come from tracking events via message broker. | `CONTEXT.md`, `driverLoyaltyService` comments | Broker exists, but no runtime producer/consumer exists. | Wire tracking producer and loyalty consumer. |

## UI And Product Flow Review

The frontend is currently not connected to the operational product beyond login.

Current frontend:

- `LoginPage` calls `/auth/login`.
- `DashboardPage` only confirms a JWT exists.
- There are no pages for Shipments, Tracking, Routes, Drivers, Senders, Notifications, Support Tickets, Customer views, or AI Chat.
- The login UI has visible labels, error messages, focus states, disabled submit state, and reduced-motion CSS, which aligns with the high-priority parts of `UI-SKILL`.
- Some visible copy is placeholder lorem ipsum and should be replaced before demo.

What has to happen for a usable integrated demo:

- Dashboard should show actual service status and core data, not only "JWT + navigation test".
- Customer/support flows need navigation to Shipment detail.
- Shipment detail should combine:
  - `GET /shipments/:shipmentId`
  - `GET /routes?shipmentId=:shipmentId`
  - `GET /tracking/shipments/:shipmentId/status`
  - `GET /notifications?receiverCustomerId=:receiverCustomerId`
- Driver view should show:
  - availability from `driverService`
  - assigned shipments once `driverId` exists on Shipment
  - points from `driverLoyaltyService`
- UI should use loading states, empty states, error recovery, and accessible controls for all API calls.

## Current Integration Gaps

### Gateway And Compose

- `routeService` is implemented but missing from `docker-compose.yml`.
- `customerService` is implemented but missing from `docker-compose.yml`.
- `customerSupportService` is implemented but missing from `docker-compose.yml`.
- `senderService` and `aiChatService` are in Compose but bypass Traefik and are not on the same Docker networks as `shipments-service`.
- Root README gateway table is stale. It lists `/items`, but no `service-template` is in Compose. It does not list `/routes`, `/senders`, `/chat`, `/conversations`, `/customers`, `/tickets`, or `/search`.
- `notification_db_data`, `sender_db_data`, and `ai_chat_db_data` are used by services but not all are declared in top-level `volumes:`.

### Service-To-Service Contracts

- `senderService` calls `GET /shipments?senderId=...`, but `shipmentsService` does not filter by `senderId`.
- `customerService` calls `GET /shipments?customerId=...`, which is supported as `receiverCustomerId`, but also sends unsupported `destination`.
- `customerSupportService` sends unsupported `destination` and `reference` filters.
- `aiChatService` reads Shipments but has no timeout around the HTTP calls.
- `routeService` and `trackingService` correctly verify Shipments by HTTP and do not read Mongo directly.
- `trackingService` does not validate route/stop metadata against `routeService`.

### Auth And Identity

- `loginService` has no health endpoint.
- Most APIs do not validate JWTs.
- Traefik ForwardAuth is not configured.
- The JWT `sub` from `loginService` is a static user id such as `usr_driver`, while `driverService` driver records use PostgreSQL UUIDs.
- Loyalty points currently align to the JWT subject, not necessarily the driver profile id.

### Eventing

- RabbitMQ is present.
- `messageBroker` is present.
- `driverLoyaltyService` has an event handler stub.
- No service publishes tracking/shipment events.
- No service starts a broker consumer.
- `notificationService` polls Shipments for delays instead of receiving tracking delay/exception events.

### Tracking Correctness

- The comment in `TrackingEvent.js` says `location_updated` is telemetry only.
- The definition still sets `shipmentStatus: 'in_transit'`.
- The `/location` route injects `status: 'in_transit'`.
- Result: a location ping can influence latest lifecycle status even though the response says it does not change Shipment lifecycle status.

### Service Documentation

- `aiChatService`, `customerService`, `customerSupportService`, and `senderService` lack service README files.
- Some services have `.env.example`; many do not.
- `customerService` and `customerSupportService` have empty leftover `src/app.py` and `src/Dockerfile` files.

## What Has To Happen

This is the practical minimum to make the system verifiably integrated.

### 1. Make Compose Match The Implemented Code

Add `route-service`:

- build `./Services/routeService`
- add `route_db`
- add `route_db_data`
- attach to `web` and `internal`
- route `/routes` through Traefik
- pass `DATABASE_URL`, `SHIPMENTS_SERVICE_URL`, `GOOGLE_MAPS_API_KEY`, and route calculation env vars

Fix `sender-service`:

- attach service to `web` and `internal`
- attach `sender_db` to `internal`
- add Traefik route `/senders`
- keep or remove direct host port as a dev-only choice

Fix `ai-chat-service`:

- attach service to `web` and `internal`
- attach `ai_chat_db` to `internal`
- add Traefik routes `/chat` and `/conversations`
- keep or remove direct host port as a dev-only choice

Add `customer-service` if it is an active service:

- add `customer_db`
- route `/customers`
- attach to `web` and `internal`
- set `SHIPMENTS_SERVICE_URL=http://shipments-service:5000`

Add `customer-support-service` if it is an active service:

- add `customer_support_db`
- route `/tickets` and `/search`
- attach to `web` and `internal`
- set `SHIPMENTS_SERVICE_URL=http://shipments-service:5000`

### 2. Fix The Shipment Query Contract

Extend `GET /shipments` with filters that existing callers already expect:

```txt
senderId
customerId
receiverCustomerId
status
routeId
driverId
```

Do not keep pretending that `destination` and `reference` exist unless Shipment gets those fields or a real search implementation.

Recommended small fix:

- support `senderId`
- support `receiverCustomerId`
- keep `customerId` as an alias for `receiverCustomerId`
- support `routeId`
- add `driverId` only after `driverId` exists on the Shipment model
- remove or ignore unsupported `destination` and `reference` in callers until a real field exists

### 3. Align Driver Assignment

ADR-0005 says Driver assignment belongs directly on Shipment.

Minimum implementation:

- add nullable `driverId` to `ShipmentSchema`
- allow `PUT /shipments/:id` to set it through existing update behavior
- use `GET /drivers?available=true` to find available drivers
- keep Route assignment fields as planning metadata only
- decide one canonical Driver identifier:
  - preferred for logistics data: `driverService` UUID
  - current loyalty/auth reality: JWT `sub`

The mismatch between driver profile UUID and JWT user id must be resolved before loyalty points can reliably belong to the same Driver seen in `driverService`.

### 4. Fix Tracking Telemetry

Make `location_updated` a true side event:

- remove lifecycle `shipmentStatus` from `location_updated`
- stop injecting `status: 'in_transit'` in `/location`
- keep the "does not change Shipment lifecycle status" response
- keep location in latest location queries

This matches the service README and prevents accidental lifecycle movement from GPS pings.

### 5. Wire Events Only Where They Add Value

Do not convert everything to events. Start with loyalty because the code and domain docs already point there.

Minimum event flow:

- `trackingService` publishes to RabbitMQ after creating non-duplicate tracking events.
- `driverLoyaltyService` joins the `broker` network.
- `driverLoyaltyService` starts a consumer from `index.js`.
- The consumer calls the existing `handleShipmentEvent`.

Minimal event contract:

```json
{
  "type": "intermediate_event",
  "driverId": "driver-id",
  "shipmentId": "shipment-id",
  "trackingEventId": "tracking-event-id",
  "eventType": "in_transit_milestone",
  "occurredAt": "2026-05-08T12:00:00.000Z"
}
```

Suggested mapping:

| Tracking Event | Loyalty Event |
|---|---|
| `goods_delivered`, `pod_confirmed`, `shipment_completed_closed` | `delivered` |
| `departed_origin_terminal`, `in_transit_milestone`, `arrived_destination_terminal`, `out_for_delivery` | `intermediate_event` |

Keep notification polling for now. Later, `delay_logged` and `exception_logged` can become notification-producing events.

### 6. Add Health And Verification

Add missing `/health` endpoints:

- `loginService`
- `driverLoyaltyService`

Add Compose healthchecks for service containers that expose `/health`.

Do not rely on gateway `/health`, because the frontend route can catch it. Use container healthchecks or service-specific health paths if external health checks are needed.

### 7. Update The Frontend Into A Real Integration Surface

The frontend should prove the integration works.

Minimum demo screens:

- Login screen using `/auth/login`
- Dashboard with service health/status cards
- Shipments list using `/shipments`
- Shipment detail combining Shipment, Route, Tracking, and Notifications
- Driver list/availability view using `/drivers`
- Sender view using `/senders`
- Support search/tickets view using `/search` and `/tickets`
- AI chat panel using `/chat`

UI-SKILL requirements for these screens:

- visible labels on forms
- loading state for every async action
- error message close to the failed action
- empty states for empty lists
- accessible focus states
- no hover-only interactions
- mobile layout without horizontal scroll
- predictable navigation and back behavior
- readable status labels, not color-only status indicators

## Integration Fix

This is the recommended order to implement.

### Phase 1: Runtime Wiring

1. Add `route-service` and `route_db` to Compose.
2. Add `/routes` Traefik route.
3. Fix `sender-service` networks and add `/senders` Traefik route.
4. Fix `ai-chat-service` networks and add `/chat` plus `/conversations` Traefik routes.
5. Declare missing volumes.
6. Update root README gateway route table.
7. Run `docker compose config`.
8. Run `docker compose up --build`.

Expected result:

- routeService can verify Shipments.
- routeService can sync `routeId` and `estimatedArrivalAt`.
- senderService and aiChatService can actually reach `shipments-service`.
- all main user-facing services are accessed through Traefik.

### Phase 2: API Contract Fixes

1. Add missing `GET /shipments` filters.
2. Add `driverId` to Shipment if ADR-0005 remains accepted.
3. Fix tracking `location_updated` telemetry semantics.
4. Add `/health` to login and loyalty.
5. Add service READMEs or minimal API docs for sender, customer, support, and chat.

Expected result:

- existing service calls match actual API behavior.
- current domain docs stop contradicting runtime behavior.
- smoke tests can verify meaningful data flow.

### Phase 3: User-Facing Integration

1. Add frontend API clients for shipments, routes, tracking, drivers, senders, notifications, support, and chat.
2. Replace placeholder dashboard copy.
3. Add Shipment detail page.
4. Add route/tracking timeline display.
5. Add notification inbox/status visibility.
6. Add support search and tickets workflow.

Expected result:

- the browser can demonstrate the business flow end to end.
- UI reflects backend integration status instead of hiding it.

### Phase 4: Event Integration

1. Decide whether services use RabbitMQ directly or publish through `messageBroker`.
2. Connect `trackingService` as event producer.
3. Connect `driverLoyaltyService` as event consumer.
4. Add idempotency to loyalty point awarding.
5. Add tests around event mapping and duplicate handling.

Expected result:

- tracking events create loyalty points without manual calls.
- broker exists for a real reason.

## Future Changes

These are useful, but should not block the first integration pass.

### Auth Hardening

- Decide whether `loginService` should be renamed/documented as `identityService`.
- Add Traefik ForwardAuth or shared JWT middleware.
- Protect mutating endpoints first:
  - `POST/PUT/DELETE /shipments`
  - tracking event creation
  - route creation/update/deletion
  - driver availability updates
  - support ticket writes

### Observability

- Add `X-Request-Id` generation/pass-through.
- Log method, path, status, service, request id, and duration.
- Standardize JSON errors:

```json
{
  "error": "Human readable message",
  "code": "MACHINE_READABLE_CODE",
  "requestId": "request-id"
}
```

### Data Consistency

- Add reference verification where it matters:
  - Sender exists before Shipment creation
  - ReceiverCustomer exists before Shipment creation
  - Driver exists before assigning `driverId`
  - Route exists before tracking references route/stop metadata
- Avoid distributed transactions. Use verification plus clear failure responses.

### Search And Read Models

- Do not overload `shipmentsService` with every possible search view forever.
- For now, add only the filters existing services need.
- Later, consider a dedicated read model if support search grows into cross-service search.

### Frontend Quality

- Add route-level loading states and error recovery.
- Add mobile-first layouts for all operational pages.
- Use semantic status tokens with text labels.
- Keep touch targets at least 44px high.
- Avoid color-only status meaning.
- Add empty states and retry actions.

## Verification Plan

### Static Verification

Run:

```powershell
docker compose config
```

Run per-service tests where available:

```powershell
npm.cmd test
```

Services with test scripts:

- `shipmentsService`
- `trackingService`
- `routeService`
- `loginService`
- `notificationService`
- `driverLoyaltyService/src`
- `senderService` has a script but no tests found
- `aiChatService` has a script but no tests found
- `customerService` has a script but no tests found
- `customerSupportService` has a script but no tests found

### Runtime Smoke Test

After Compose wiring:

1. `docker compose up --build`
2. `GET http://localhost/shipments`
3. `POST http://localhost/auth/login`
4. `GET http://localhost/drivers`
5. `GET http://localhost/tracking/shipments/:shipmentId/status`
6. `POST http://localhost/routes`
7. `GET http://localhost/routes?shipmentId=:shipmentId`
8. `GET http://localhost/senders`
9. `POST http://localhost/chat`
10. `GET http://localhost/notifications`

### End-To-End Business Verification

Use one Shipment Mongo `_id` through the whole flow:

1. Create Sender.
2. Create ReceiverCustomer.
3. Create Shipment.
4. Create `shipment_order_created` tracking event.
5. Create Route Plan.
6. Confirm Shipment now has `routeId` and `estimatedArrivalAt`.
7. Post tracking milestones until delivered.
8. Confirm Shipment status reaches `received`.
9. Confirm notification delay scan still works for delayed in-transit shipments.
10. Confirm loyalty points update once eventing is wired.

## Implementation Backlog

Priority 0 means the integration cannot be trusted until it is done.

| Priority | Work | Why |
|---:|---|---|
| 0 | Add `route-service`, `route_db`, and `/routes` to Compose/Traefik. | routeService is implemented but not runnable in the system. |
| 0 | Put `sender-service` and `ai-chat-service` on shared networks and Traefik. | They currently call `shipments-service` but cannot reliably reach it in Compose. |
| 0 | Declare missing volumes. | Prevent Compose runtime surprises. |
| 0 | Add missing `GET /shipments` filters used by existing callers. | Current readers ask for data the API does not filter. |
| 0 | Fix `location_updated` telemetry semantics. | Prevent incorrect Shipment lifecycle interpretation. |
| 1 | Add `driverId` to Shipment or revise ADR-0005. | Domain docs and code currently disagree. |
| 1 | Add health endpoints to login and loyalty. | Needed for verification and stable Compose healthchecks. |
| 1 | Add customer and support services to Compose if they are active. | They are implemented but unreachable. |
| 1 | Update frontend beyond placeholder dashboard. | Integration must be visible and testable by users. |
| 2 | Wire tracking events to loyalty through RabbitMQ. | Makes the broker useful and completes loyalty flow. |
| 2 | Normalize env var names to `SHIPMENTS_SERVICE_URL`. | Reduces service setup confusion. |
| 2 | Add basic request id and common error shape. | Makes cross-service failures traceable. |
| 3 | Add ForwardAuth/shared JWT middleware. | Needed before production-like access control. |
| 3 | Add event-driven notifications for delay/exception events. | Faster than polling, but polling works today. |

## Final Position

The smallest correct integration fix is:

1. make Compose and Traefik match the services that already exist
2. make service HTTP contracts match the calls already written
3. resolve the few domain contradictions found by the docs/code cross-check
4. turn the frontend from a login test into an operational integration dashboard
5. wire RabbitMQ only after the HTTP bridge is stable

That gets NTG 2.0 into a verifiable integrated state without changing the architecture.

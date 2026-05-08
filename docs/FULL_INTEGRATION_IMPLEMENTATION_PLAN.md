# NTG 2.0 Full Integration Implementation Plan

Date: 2026-05-08

## Purpose

This is the execution plan to use before letting an implementation agent make the full integration changes.

It is derived from `inspectionreview.md`, the current codebase review, root `CONTEXT.md`, existing ADRs, and the repo-local `.github` engineering skills.

The goal is to make NTG 2.0 run as one coherent local system without rewriting the architecture.

## Skill Guidance Applied

`grill-with-docs`:

- cross-check implementation against root domain language
- protect service ownership boundaries
- prefer precise terms like Shipment, Sender, ReceiverCustomer, Route, Driver, Tracking Event, Notification
- surface contradictions before implementation
- only introduce ADR-level changes when a decision is hard to reverse

`UI-SKILL`:

- require that integration is visible and testable through frontend flows
- require loading, error, empty, and retry states
- avoid color-only status indicators
- keep dashboard and shipment detail layouts responsive
- preserve accessible labels, focus states, and keyboard operation

## Resolved Decisions

These decisions are treated as accepted for implementation:

1. `customerService` is part of the current demo runtime.
2. `customerSupportService` is part of the current demo runtime.
3. `service-template` stays excluded from Compose and the root gateway table.
4. `loginService` remains the implementation name for the auth/identity role.
5. `driverId` should be added to Shipment and should reference the `driverService` driver UUID.
6. Traefik is the primary access path; direct host ports are dev-only convenience only.
7. Auth remains POC-level for the first bridge.
8. Unsupported search fields must not be faked in Shipment; support search should own broader search behavior.

## Implementation Progress

| Slice | Status | Completion Note |
|---|---|---|
| Phase 0.1 Snapshot Current State | [COMPLETED] | `git status --short` and `docker compose config` were run. Initial Compose config exposed missing volume declarations, which Phase 1 corrected. |
| Phase 0.2 Confirm Runtime Categories | [COMPLETED] | Runtime categories matched the plan: core services wired, route/customer/support unwired, sender/chat partially wired, service-template excluded. |
| Phase 1.1 Wire `routeService` | [COMPLETED] | Added `route-service`, `route_db`, `route_db_data`, `/routes` Traefik labels, and README route entry. |
| Phase 1.2 Fix `senderService` | [COMPLETED] | Attached sender service and DB to the correct networks, added `/senders` Traefik labels, declared volume, and kept host port as dev-only. |
| Phase 1.3 Fix `aiChatService` | [COMPLETED] | Attached chat service and DB to the correct networks, added `/chat` and `/conversations` Traefik labels, declared volume, and kept host port as dev-only. |
| Phase 1.4 Wire `customerService` | [COMPLETED] | Added customer service, customer DB, volume, networks, env, and `/customers` Traefik route. |
| Phase 1.5 Wire `customerSupportService` | [COMPLETED] | Added customer support service, support DB, volume, networks, env, and `/tickets` plus `/search` Traefik routes. |
| Phase 1.6 Remove Stale Gateway Documentation | [COMPLETED] | Removed stale `/items` route from root README and documented the active gateway routes. |
| Phase 2.1 Add Shipment Filters | [COMPLETED] | Added `senderId`, `receiverCustomerId`, `routeId`, and `driverId` filters while preserving `customerId` alias and `status`; updated tests and README. |
| Phase 2.2 Add `driverId` To Shipment | [COMPLETED] | Added nullable `driverId` to `ShipmentSchema`, documented it as the driverService UUID reference, and covered create/update/filter behavior in tests. |
| Phase 2.3 Stop Faking Unsupported Search | [COMPLETED] | Removed unsupported `destination`/`reference` forwarding to shipmentsService; customer/support services now handle those as local filtering/search behavior. |
| Phase 3.1 Make `location_updated` Telemetry-Only | [COMPLETED] | `location_updated` no longer sets or syncs lifecycle status; tracking tests pass with GPS pings treated as telemetry-only. |
| Phase 3.2 Keep Route Metadata Optional | [COMPLETED] | Tracking docs now describe route/checkpoint metadata as optional references for the first integration pass, so tracking can work while routeService is unavailable. |
| Phase 4.1 Add `loginService` Health | [COMPLETED] | Added `GET /health`, README coverage, and route test; `loginService` tests pass. |
| Phase 4.2 Add `driverLoyaltyService` Health | [COMPLETED] | Added `GET /health`, README coverage, and route test; `driverLoyaltyService` tests pass. |
| Phase 4.3 Add Compose Healthchecks | [COMPLETED] | Added Node-based app healthchecks for services with `/health`; `docker compose config` validates successfully. |
| Phase 5.1 Add Missing Service READMEs | [COMPLETED] | Added READMEs for sender, AI chat, customer, and customer support services with purpose, routes, env, DB ownership, external calls, gateway routes, and limits. |
| Phase 5.2 Normalize Shipment Service Env Names | [COMPLETED] | Sender and AI chat now prefer `SHIPMENTS_SERVICE_URL` while retaining `SHIPMENTS_URL` fallback; Compose already uses the preferred name. |
| Phase 5.3 Clean Empty Leftover Files | [COMPLETED] | Confirmed zero-byte customer/support Python/Docker leftovers and deleted them; `Test-Path` confirms they are gone. |
| Phase 6.1 Add Frontend API Clients | [COMPLETED] | Added thin Traefik-path clients for Shipments, Routes, Tracking, Drivers, Notifications, Senders, Customers, Support, and Chat using `VITE_BACKEND_URL || ''`. |
| Phase 6.2 Replace Placeholder Dashboard | [COMPLETED] | Dashboard now loads integrated runtime data, shows metrics, service errors, loading states, empty states, and links to Shipment detail, Support, and Chat. |
| Phase 6.3 Add Shipment Detail Page | [COMPLETED] | Added joined Shipment detail page using Shipment, Route, Tracking, and Notification services with summary, route, timeline, goods, and notification sections. |
| Phase 6.4 Add Support And Chat Surfaces | [COMPLETED] | Added support search/ticket surface and chat/conversation surface with loading/error/empty states; frontend build passes. |
| Phase 7.1 Decide Broker Access Pattern | [COMPLETED] | Implemented the planned direct AMQP pattern; `messageBroker` remains infrastructure/helper while tracking and loyalty use RabbitMQ directly. |
| Phase 7.2 Publish Tracking Events | [COMPLETED] | Tracking now maps publishable lifecycle/milestone events to `delivered` or `intermediate_event`, includes driver/shipment/event ids, skips duplicates, and does not fail stored events on publish errors. |
| Phase 7.3 Consume Loyalty Events | [COMPLETED] | Driver loyalty now starts an optional RabbitMQ consumer, awards +50/+10, and stores consumed event ids for idempotent point awards; tracking and loyalty tests pass. |
| Phase 8.1 Protect Mutating Endpoints | [NOT STARTED] | Pending. |
| Phase 8.2 Clarify `loginService` Naming | [NOT STARTED] | Pending. |
| Phase 9 Final Smoke And Regression | [NOT STARTED] | Pending. |

## Architecture Guardrails

Do:

- keep one owning database per service
- keep `shipmentsService` as the owner of Shipment, Goods, and Items
- use Mongo `_id` as the cross-service Shipment reference
- use HTTP for current synchronous integration
- use RabbitMQ only after HTTP runtime is stable
- keep Traefik labels in `docker-compose.yml` as the API gateway source of truth
- verify every phase before continuing

Do not:

- merge service databases
- read another service's database directly
- replace Traefik with a custom gateway
- rewrite services into a new architecture
- rename `loginService` during the first bridge
- build the full frontend before backend routes are reachable
- wire RabbitMQ before services can run through Compose

## Target End State

After implementation, local development should support:

```txt
docker compose up --build
```

Then the app should be reachable through:

```txt
http://localhost
```

The gateway should expose:

| Path | Service |
|---|---|
| `/` | `frontend` |
| `/auth` | `login-service` |
| `/shipments` | `shipments-service` |
| `/tracking` | `tracking-service` |
| `/routes` | `route-service` |
| `/drivers` | `driver-service` and `driver-loyalty-service` for `/drivers/:id/points` |
| `/notifications` | `notification-service` |
| `/senders` | `sender-service` |
| `/customers` | `customer-service` |
| `/tickets` | `customer-support-service` |
| `/search` | `customer-support-service` |
| `/chat` | `ai-chat-service` |
| `/conversations` | `ai-chat-service` |

The core business flow should work:

1. Login through `loginService`.
2. Create/select Sender.
3. Create/select ReceiverCustomer.
4. Create Shipment.
5. Create initial Tracking Event.
6. Create Route Plan.
7. Sync `routeId` and `estimatedArrivalAt` back to Shipment.
8. Record Tracking milestones.
9. Sync coarse Shipment status from Tracking.
10. Show Shipment, Route, Tracking, Notifications, and Driver data in the frontend.

## Phase 0: Preflight

Purpose: make sure the agent starts from a known state.

### Slice 0.1: Snapshot Current State

Commands:

```powershell
git status --short
docker compose config
```

Expected:

- current dirty files are known
- Compose output is either valid or failures are documented
- no generated or unrelated files are touched

Stop condition:

- if unrelated user changes are in files that must be edited, inspect before patching

### Slice 0.2: Confirm Runtime Categories

Expected categories:

| Category | Services |
|---|---|
| Already wired | `shipmentsService`, `trackingService`, `driverService`, `loginService`, `notificationService`, `driverLoyaltyService` |
| Implemented but not wired | `routeService`, `customerService`, `customerSupportService` |
| Partially wired | `senderService`, `aiChatService` |
| Excluded | `service-template` |

Verification:

- inspect `docker-compose.yml`
- inspect each service `package.json`, `Dockerfile`, `src/app.js`, `src/index.js`

## Phase 1: Compose And Traefik Bridge

Purpose: make existing services reachable without changing domain behavior.

### Slice 1.1: Wire `routeService`

Files:

- `docker-compose.yml`
- `README.md`

Implementation:

- add `route-service`
- add `route_db`
- add `route_db_data`
- attach service to `web` and `internal`
- add Traefik `/routes` labels
- pass route env vars:
  - `PORT=5000`
  - `DATABASE_URL=postgres://postgres:postgres@route_db:5432/route_db`
  - `SHIPMENTS_SERVICE_URL=http://shipments-service:5000`
  - `VERIFY_SHIPMENTS=true`
  - `SHIPMENT_ROUTE_SYNC_ENABLED=true`
  - `HTTP_TIMEOUT_SECONDS=3`
  - `GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY:-AIzaSyCfVQgCV8rQjV4EjnkevYoae4hFjyZ4SL0}`
  - `ROUTE_CALCULATION_PROVIDER=google`
  - `ROUTE_CALCULATION_REQUIRED=false`

Verification:

```powershell
docker compose config
docker compose up --build route-service route_db shipments-service shipments_db traefik
Invoke-RestMethod http://localhost/routes
```

Acceptance:

- `GET /routes` returns JSON through Traefik
- routeService can resolve `shipments-service`
- root README lists `/routes`

### Slice 1.2: Fix `senderService`

Files:

- `docker-compose.yml`
- `README.md`

Implementation:

- attach `sender-service` to `web` and `internal`
- attach `sender_db` to `internal`
- add Traefik `/senders` labels
- declare `sender_db_data`
- keep direct host port only if explicitly marked dev-only

Verification:

```powershell
docker compose config
docker compose up --build sender-service sender_db shipments-service shipments_db traefik
Invoke-RestMethod http://localhost/senders
```

Acceptance:

- `GET /senders` works through Traefik
- senderService can resolve `shipments-service`

### Slice 1.3: Fix `aiChatService`

Files:

- `docker-compose.yml`
- `README.md`

Implementation:

- attach `ai-chat-service` to `web` and `internal`
- attach `ai_chat_db` to `internal`
- add Traefik `/chat` labels
- add Traefik `/conversations` labels
- declare `ai_chat_db_data`
- keep `ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}`

Verification:

```powershell
docker compose config
docker compose up --build ai-chat-service ai_chat_db shipments-service shipments_db traefik
Invoke-RestMethod http://localhost/conversations
```

Acceptance:

- `GET /conversations` works through Traefik
- aiChatService can resolve `shipments-service`
- missing Anthropic key only affects Anthropic calls, not service startup

### Slice 1.4: Wire `customerService`

Files:

- `docker-compose.yml`
- `README.md`

Implementation:

- add `customer-service`
- add `customer_db`
- add `customer_db_data`
- attach service to `web` and `internal`
- attach DB to `internal`
- add Traefik `/customers` labels
- set `SHIPMENTS_SERVICE_URL=http://shipments-service:5000`

Verification:

```powershell
docker compose config
docker compose up --build customer-service customer_db shipments-service shipments_db traefik
Invoke-RestMethod http://localhost/customers
```

Acceptance:

- `GET /customers` works through Traefik
- customerService can resolve `shipments-service`

### Slice 1.5: Wire `customerSupportService`

Files:

- `docker-compose.yml`
- `README.md`

Implementation:

- add `customer-support-service`
- add `customer_support_db`
- add `customer_support_db_data`
- attach service to `web` and `internal`
- attach DB to `internal`
- add Traefik `/tickets` labels
- add Traefik `/search` labels
- set `SHIPMENTS_SERVICE_URL=http://shipments-service:5000`

Verification:

```powershell
docker compose config
docker compose up --build customer-support-service customer_support_db shipments-service shipments_db traefik
Invoke-RestMethod http://localhost/tickets
```

Acceptance:

- `GET /tickets` works through Traefik
- `GET /search/delayed` can reach shipments after shipments are up

### Slice 1.6: Remove Stale Gateway Documentation

Files:

- `README.md`

Implementation:

- remove `/items -> service-template`
- keep `service-template` out of Compose
- update route table to match actual Traefik labels

Verification:

- README route table matches `docker-compose.yml`

## Phase 2: Service Contract Fixes

Purpose: make actual service calls match actual target APIs.

### Slice 2.1: Add Shipment Filters

Files:

- `Services/shipmentsService/src/routes/shipments.js`
- `Services/shipmentsService/src/__tests__/shipments.test.js`
- `Services/shipmentsService/README.md`

Implementation:

Add supported filters:

```txt
senderId
customerId
receiverCustomerId
status
routeId
driverId
```

Expected code shape:

```js
if (req.query.customerId) filter.receiverCustomerId = req.query.customerId
if (req.query.receiverCustomerId) filter.receiverCustomerId = req.query.receiverCustomerId
if (req.query.senderId) filter.senderId = req.query.senderId
if (req.query.status) filter.status = req.query.status
if (req.query.routeId) filter.routeId = req.query.routeId
if (req.query.driverId) filter.driverId = req.query.driverId
```

Tests:

- filter by `senderId`
- filter by `receiverCustomerId`
- existing `customerId` still works
- filter by `status`
- filter by `routeId`
- filter by `driverId` after driver field exists

Verification:

```powershell
cd Services/shipmentsService
npm.cmd test
```

Acceptance:

- existing service callers no longer rely on unsupported core filters

### Slice 2.2: Add `driverId` To Shipment

Files:

- `Services/shipmentsService/src/models/Shipment.js`
- `Services/shipmentsService/src/__tests__/shipments.test.js`
- `Services/shipmentsService/README.md`

Implementation:

```js
driverId: { type: String, default: null },
```

Rules:

- `driverId` references `driverService` driver UUID
- do not use `loginService` JWT subject as the logistics driver id
- assignment can happen through existing `PUT /shipments/:id`

Tests:

- Shipment can be created without `driverId`
- Shipment can be updated with `driverId`
- Shipment can be filtered by `driverId`

Verification:

```powershell
cd Services/shipmentsService
npm.cmd test
```

Acceptance:

- ADR-0005 and code agree

### Slice 2.3: Stop Faking Unsupported Search

Files:

- `Services/customerService/src/routes/shipments.js`
- `Services/customerSupportService/src/routes/search.js`
- related READMEs once added

Implementation:

- do not send `destination` or `reference` to `shipmentsService` unless real target fields exist
- keep support search behavior inside `customerSupportService` if it must perform broad text/search logic
- document which filters are authoritative on `shipmentsService`

Acceptance:

- service-to-service calls only use supported target query params
- support search remains honest about what it can verify

## Phase 3: Tracking Correctness

Purpose: make tracking status semantics match the tracking README and response text.

### Slice 3.1: Make `location_updated` Telemetry-Only

Files:

- `Services/trackingService/src/models/TrackingEvent.js`
- `Services/trackingService/src/routes/tracking.js`
- `Services/trackingService/src/__tests__/trackingEvent.test.js`
- `Services/trackingService/README.md`

Implementation:

- set `location_updated.shipmentStatus` to `null`
- stop injecting `status: 'in_transit'` in `/location`
- preserve location validation
- preserve latest location behavior
- preserve shipment status sync skip response

Tests:

- location update has no lifecycle status
- latest location still updates
- location update does not sync Shipment status

Verification:

```powershell
cd Services/trackingService
npm.cmd test
```

Acceptance:

- GPS pings no longer affect coarse lifecycle status

### Slice 3.2: Keep Route Metadata Optional For Now

Files:

- `Services/trackingService/README.md`
- `Services/routeService/TRACKING_FINALIZATION.md`

Implementation:

- document that `routeId`, `stopId`, and checkpoint metadata are references
- do not block tracking event creation on routeService validation in the first integration pass

Acceptance:

- tracking remains usable even if routeService is temporarily unavailable

## Phase 4: Health And Runtime Checks

Purpose: make services observable enough for Compose and smoke tests.

### Slice 4.1: Add `loginService` Health

Files:

- `Services/loginService/src/app.js`
- `Services/loginService/src/__tests__/auth.routes.test.js` or new test
- `Services/loginService/README.md`

Endpoint:

```txt
GET /health
```

Response:

```json
{ "status": "ok", "service": "login-service" }
```

Verification:

```powershell
cd Services/loginService
npm.cmd test
```

### Slice 4.2: Add `driverLoyaltyService` Health

Files:

- `Services/driverLoyaltyService/src/app.js`
- `Services/driverLoyaltyService/src/__tests__/points.routes.test.js` or new test
- `Services/driverLoyaltyService/README.md`

Endpoint:

```txt
GET /health
```

Response:

```json
{ "status": "ok", "service": "driver-loyalty-service" }
```

Verification:

```powershell
cd Services/driverLoyaltyService/src
npm.cmd test
```

### Slice 4.3: Add Compose Healthchecks

Files:

- `docker-compose.yml`

Implementation:

- add app healthchecks where `/health` exists
- use internal container port

Example:

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -qO- http://localhost:5000/health || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 10
```

Verification:

```powershell
docker compose config
docker compose up --build
docker compose ps
```

Acceptance:

- Compose shows health for core services

## Phase 5: Documentation And Environment Cleanup

Purpose: make setup and ownership obvious for the next developer.

### Slice 5.1: Add Missing Service READMEs

Files:

- `Services/senderService/README.md`
- `Services/aiChatService/README.md`
- `Services/customerService/README.md`
- `Services/customerSupportService/README.md`

Each README must include:

- purpose
- owned data
- routes
- env vars
- external calls
- database
- Compose route
- known limitations

### Slice 5.2: Normalize Shipment Service Env Names

Files:

- `Services/senderService/src/routes/shipments.js`
- `Services/aiChatService/src/routes/chat.js`
- service READMEs
- `docker-compose.yml`

Implementation:

- prefer `SHIPMENTS_SERVICE_URL`
- keep `SHIPMENTS_URL` as fallback

Code pattern:

```js
const SHIPMENTS_URL = process.env.SHIPMENTS_SERVICE_URL || process.env.SHIPMENTS_URL || 'http://localhost:5000'
```

Acceptance:

- old local env still works
- Compose uses `SHIPMENTS_SERVICE_URL`

### Slice 5.3: Clean Empty Leftover Files

Files:

- `Services/customerService/src/app.py`
- `Services/customerService/src/Dockerfile`
- `Services/customerSupportService/src/app.py`
- `Services/customerSupportService/src/Dockerfile`

Implementation:

- delete only if confirmed empty and unused

Verification:

```powershell
Get-Item Services/customerService/src/app.py,Services/customerService/src/Dockerfile,Services/customerSupportService/src/app.py,Services/customerSupportService/src/Dockerfile
```

Acceptance:

- no empty Python/Docker leftovers confuse service ownership

## Phase 6: Frontend Integration Surface

Purpose: prove the integrated backend through user-visible workflows.

Do this after Phases 1 through 4 are green.

### Slice 6.1: Add Frontend API Clients

Files:

- `frontend/src/clients/shipmentsClient.js`
- `frontend/src/clients/routesClient.js`
- `frontend/src/clients/trackingClient.js`
- `frontend/src/clients/driversClient.js`
- `frontend/src/clients/notificationsClient.js`
- `frontend/src/clients/sendersClient.js`
- `frontend/src/clients/customersClient.js`
- `frontend/src/clients/supportClient.js`
- `frontend/src/clients/chatClient.js`

Rules:

- use `VITE_BACKEND_URL || ''`
- include JWT where required
- parse JSON safely
- return useful error messages

Verification:

```powershell
cd frontend
npm.cmd run build
```

### Slice 6.2: Replace Placeholder Dashboard

Files:

- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/styles.css`

Dashboard content:

- shipments count
- delayed shipments count
- active tracking statuses
- available drivers count
- notifications summary
- links to Shipment detail, Sender, Support, and Chat

UI requirements from `UI-SKILL`:

- loading states
- error states with retry
- empty states
- accessible labels
- focus states
- no color-only statuses
- responsive layout without horizontal scroll

Verification:

```powershell
cd frontend
npm.cmd run build
```

### Slice 6.3: Add Shipment Detail Page

Files:

- `frontend/src/pages/ShipmentDetailPage.jsx`
- `frontend/src/App.jsx`
- `frontend/src/styles.css`

Data sources:

```txt
GET /shipments/:shipmentId
GET /routes?shipmentId=:shipmentId
GET /tracking/shipments/:shipmentId/status
GET /notifications?receiverCustomerId=:receiverCustomerId
```

Sections:

- Shipment summary
- Goods and Items
- Route and ETA
- Tracking timeline
- Latest location
- Notifications

Acceptance:

- one Shipment page visibly joins data from at least three services

### Slice 6.4: Add Support And Chat Surfaces

Files:

- `frontend/src/pages/SupportPage.jsx`
- `frontend/src/pages/ChatPage.jsx`
- `frontend/src/App.jsx`
- `frontend/src/styles.css`

Support:

- search Shipment by id
- view delayed/discrepancy data
- list/create tickets

Chat:

- send message to `/chat`
- show conversation list
- show loading and error states

Acceptance:

- support and AI flows are reachable from dashboard

## Phase 7: RabbitMQ Event Integration

Purpose: finish the async flow that the domain already describes.

Do this only after HTTP runtime is stable.

### Slice 7.1: Decide Broker Access Pattern

Recommended:

- services use direct AMQP clients for producer/consumer flow
- keep `messageBroker` as infrastructure/helper for now

Reason:

- consumer services need long-running queue consumption
- a thin HTTP publish service does not solve consumer startup

### Slice 7.2: Publish Tracking Events

Files:

- `Services/trackingService/package.json`
- `Services/trackingService/src/services/trackingEventsPublisher.js`
- `Services/trackingService/src/routes/tracking.js`
- `docker-compose.yml`
- tests under `Services/trackingService/src/__tests__`

Events:

| Tracking Event | Broker Event |
|---|---|
| `goods_delivered` | `delivered` |
| `pod_confirmed` | `delivered` |
| `shipment_completed_closed` | `delivered` |
| `departed_origin_terminal` | `intermediate_event` |
| `in_transit_milestone` | `intermediate_event` |
| `arrived_destination_terminal` | `intermediate_event` |
| `out_for_delivery` | `intermediate_event` |

Rules:

- do not publish duplicate idempotency events
- publishing failure must not remove a stored tracking event
- include `driverId` when present

### Slice 7.3: Consume Loyalty Events

Files:

- `Services/driverLoyaltyService/src/index.js`
- `Services/driverLoyaltyService/src/consumers/shipment.consumer.js`
- `Services/driverLoyaltyService/src/db.js`
- tests under `Services/driverLoyaltyService/src/__tests__`
- `docker-compose.yml`

Implementation:

- attach `driver-loyalty-service` to `broker`
- start consumer on boot
- call existing `handleShipmentEvent`
- add idempotency before production-like usage

Acceptance:

- delivered event gives +50
- intermediate event gives +10
- duplicate event does not double-award after idempotency is in place

## Phase 8: Auth Hardening

Purpose: move from demo auth to protected operations.

Do this after integration is running.

### Slice 8.1: Protect Mutating Endpoints

First protected endpoints:

- `POST /shipments`
- `PUT /shipments/:id`
- `DELETE /shipments/:id`
- `POST /tracking/shipments/:shipmentId/events`
- `POST /tracking/shipments/:shipmentId/location`
- `POST /routes`
- `PUT /routes/:routeId`
- `DELETE /routes/:routeId`
- `PATCH /drivers/:id/availability`
- ticket write routes

Recommended first implementation:

- use service-local JWT middleware or Traefik ForwardAuth, not both mixed randomly
- since `driverLoyaltyService` already has inline JWT middleware, inline middleware is the quickest consistent first step

### Slice 8.2: Clarify `loginService` Naming

Files:

- `docs/adr/0004-identity-service-handles-platform-auth.md`
- `Services/loginService/README.md`
- `README.md`

Implementation:

- document that `loginService` currently fulfills the identity/auth role
- do not rename files/services in this phase

## Phase 9: Final Smoke And Regression

Run all available tests:

```powershell
cd Services/shipmentsService; npm.cmd test
cd ..\trackingService; npm.cmd test
cd ..\routeService; npm.cmd test
cd ..\loginService; npm.cmd test
cd ..\notificationService; npm.cmd test
cd ..\driverLoyaltyService\src; npm.cmd test
```

Run frontend build:

```powershell
cd frontend
npm.cmd run build
```

Run Compose:

```powershell
docker compose config
docker compose up --build
```

Gateway smoke checks:

```txt
GET  http://localhost/shipments
POST http://localhost/auth/login
GET  http://localhost/drivers
GET  http://localhost/routes
GET  http://localhost/senders
GET  http://localhost/customers
GET  http://localhost/tickets
GET  http://localhost/notifications
GET  http://localhost/conversations
GET  http://localhost/tracking/shipments/:shipmentId/status
```

Business smoke:

1. Create or select Sender.
2. Create or select ReceiverCustomer.
3. Create Shipment.
4. Assign Driver to Shipment.
5. Create initial Tracking Event.
6. Create Route Plan.
7. Confirm Shipment has `routeId` and `estimatedArrivalAt`.
8. Record tracking milestones.
9. Confirm Shipment lifecycle status syncs.
10. Open frontend Shipment detail and verify joined data.

## Execution Order

Use this exact order unless a blocker is discovered:

1. Phase 0: Preflight
2. Phase 1: Compose and Traefik bridge
3. Phase 2: service contract fixes
4. Phase 3: tracking correctness
5. Phase 4: health and runtime checks
6. Phase 5: docs/env cleanup
7. Phase 9 partial: backend tests and Compose smoke
8. Phase 6: frontend integration surface
9. Phase 7: RabbitMQ loyalty flow
10. Phase 8: auth hardening
11. Phase 9 full: final smoke and regression

## Priority Backlog

| Priority | Work | Main Files | Verification |
|---:|---|---|---|
| 0 | Wire `routeService` | `docker-compose.yml`, `README.md` | `GET /routes` through Traefik |
| 0 | Fix sender/chat networks | `docker-compose.yml`, `README.md` | `GET /senders`, `GET /conversations` |
| 0 | Wire customer/support | `docker-compose.yml`, `README.md` | `GET /customers`, `GET /tickets` |
| 0 | Add Shipment filters | `shipments.js`, tests, README | `shipmentsService` tests |
| 0 | Add Shipment `driverId` | `Shipment.js`, tests, README | `shipmentsService` tests |
| 0 | Fix `location_updated` | tracking model/route/tests | `trackingService` tests |
| 1 | Add health endpoints/checks | login, loyalty, Compose | service tests, `docker compose ps` |
| 1 | Add missing READMEs | service README files | docs inspection |
| 1 | Normalize shipment env names | sender/chat/Compose/docs | service smoke |
| 2 | Build frontend dashboard/detail | frontend files | `npm run build`, browser smoke |
| 2 | Wire RabbitMQ loyalty events | tracking, loyalty, Compose | event tests and smoke |
| 3 | Harden auth | services/Traefik/docs | unauthorized write fails |

## Stop Conditions

Stop and report before continuing if:

- `docker compose config` fails after a Compose edit
- a service cannot start because its Dockerfile/package layout differs from expectation
- a test suite fails in a service outside the edited scope
- an endpoint listed as existing is missing from code
- a domain decision conflicts with root `CONTEXT.md` or ADRs
- user changes appear in files being edited and the intended merge is unclear

## First Implementation Task

When implementation begins, start with:

```txt
Phase 1, Slice 1.1: Wire routeService
```

Files:

```txt
docker-compose.yml
README.md
```

Done means:

```txt
GET http://localhost/routes
```

works through Traefik and `routeService` can reach:

```txt
http://shipments-service:5000/shipments/:id
```

No frontend, RabbitMQ, or auth hardening should happen before this first runtime bridge is verified.

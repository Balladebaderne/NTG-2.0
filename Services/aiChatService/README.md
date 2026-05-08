# AI Chat Service

Provides a demo AI assistant surface for Shipment-related questions and stores conversation history.

## Owned Data

- `Conversation` documents in MongoDB
- `conversationId` is a generated UUID
- Optional `customerId` links a conversation to a customer-facing context

## Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `POST` | `/chat` | Send a chat message and receive an assistant response |
| `GET` | `/conversations` | List conversations, optionally filtered by `customerId` |
| `GET` | `/conversations/:id` | Get one conversation by `conversationId` |
| `DELETE` | `/conversations/:id` | Delete one conversation |

## Environment

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5004` | HTTP port |
| `MONGODB_URI` | `mongodb://localhost:27017/ai_chat_db` | Conversation MongoDB connection |
| `SHIPMENTS_SERVICE_URL` | `http://localhost:5000` | Preferred Shipment service base URL |
| `SHIPMENTS_URL` | unset | Backward-compatible fallback for local setups |
| `ANTHROPIC_API_KEY` | unset | Required for live Anthropic responses |

## External Calls

- Calls `shipmentsService` over HTTP for Shipment context.
- Compose uses `http://shipments-service:5000`.
- Broad destination matching is local chat context filtering; unsupported fields are not sent as authoritative Shipment filters.
- Calls Anthropic when `/chat` is used.

## Database

MongoDB is owned by this service. No other service should read `ai_chat_db` directly.

## Compose Route

Traefik exposes this service through `/chat` and `/conversations`.

## Known Limitations

- Missing `ANTHROPIC_API_KEY` should only affect live chat responses, not service startup.
- Intent detection is simple pattern matching for the demo flow.

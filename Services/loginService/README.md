# Login Service

Handles user authentication and issues JWT tokens for the NTG platform.

## Stack

- **Runtime:** Node.js 18
- **Framework:** Express
- **Auth:** JSON Web Tokens (`jsonwebtoken`)

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health check |
| `POST` | `/auth/login` | Authenticate and receive a JWT |

### POST `/auth/login`

**Request body:**
```json
{ "email": "admin@ntg.local", "password": "admin123" }
```

**Response (200):** JWT token payload  
**Response (401):** `{ "message": "Invalid email or password." }`

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5001` | Port to listen on |
| `JWT_SECRET` | `local-login-secret-change-me` | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | `1h` | Token expiry duration |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

## Test Users

| Email | Password | Role |
|-------|----------|------|
| `admin@ntg.local` | `admin123` | Admin |
| `driver@ntg.local` | `driver123` | Driver |
| `support@ntg.local` | `support123` | Customer Support |
| `logistics@ntg.local` | `logistics123` | Logistical Management |

> ⚠️ Users are stored in `src/login/users.json` — for local/demo use only.

## Run

```bash
# Local
npm install
npm start

# Docker
docker build -t ntg-login-service .
docker run -p 5001:5001 ntg-login-service
```

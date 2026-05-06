# Gateway Routes

This folder contains route modules mounted by the gateway.

## `authProxy.js`

`authProxy.js` creates an Express router for authentication proxying. It exposes:

```text
POST /auth/login
```

The route forwards the request body to:

```text
{LOGIN_SERVICE_URL}/auth/login
```

The frontend sends email and password. The login service owns role lookup and includes the user's
role in the signed JWT when authentication succeeds. The gateway returns the login service response
status and JSON payload to the frontend.

## Error Handling

If the login service cannot be reached, the route returns:

```json
{ "message": "Login service is unavailable." }
```

with status `502`.

## Design Intent

Routes in this folder should be small boundary adapters. They translate public gateway routes into internal service calls while keeping service-specific logic inside the owning service.

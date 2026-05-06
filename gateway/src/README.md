# Gateway Source Architecture

`src/index.js` starts the Express gateway service.

## Main Responsibilities

- Configure CORS for the frontend origin.
- Parse incoming JSON requests.
- Expose `GET /health` for gateway health checks.
- Mount authentication routes from `routes/authProxy.js` under `/auth`.

## How It Connects

The frontend calls the gateway at `http://localhost:8080`. For auth requests, `index.js` delegates to `createAuthProxyRouter`, passing the internal `LOGIN_SERVICE_URL` from the environment.

Inside Docker Compose, `LOGIN_SERVICE_URL` is set to:

```text
http://login-service:5001
```

Docker resolves `login-service` to the login service container.

## Design Intent

The gateway is the public backend entry point. It keeps browser-facing URLs stable and hides internal service locations from the frontend.

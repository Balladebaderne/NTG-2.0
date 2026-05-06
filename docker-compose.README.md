# Docker Compose Architecture

`docker-compose.yml` starts the local NTG development stack and connects public services to Traefik.

## Services

- `traefik` runs the public entry point on port `80` and the dev dashboard on port `9090`.
- `frontend` runs the Vite React app internally on port `3000`.
- `login-service` owns authentication and JWT creation on port `5001`.
- `shipments-service` owns shipment APIs on port `5000`.
- `shipments_db` is reachable only on the private internal network.

## Request Flow

The browser loads the React app through Traefik at `http://localhost`. When the app needs to log in, it calls the same origin path `/auth/login`.

Traefik receives `POST /auth/login` and routes it to `login-service` on its internal port `5001`. This keeps the browser talking to one public entry point while internal services stay behind Docker networking.

## Design Intent

Traefik is the boundary between the frontend and backend services. The frontend should not need to know every internal service URL. New backend capabilities can be added behind the gateway with Docker labels.

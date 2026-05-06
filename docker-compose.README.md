# Docker Compose Architecture

`docker-compose.yml` starts the local NTG development stack and connects the services on one Docker network.

## Services

- `frontend` runs the Vite React app on port `3000`.
- `gateway` runs the public API entry point on port `8080`.
- `login-service` owns authentication and JWT creation on port `5001`.
- `service-template` is a sample backend service connected to PostgreSQL.
- `service_template_db` is the PostgreSQL database used by `service-template`.

## Request Flow

The browser loads the React app from `frontend`. When the app needs to log in, it calls the gateway URL from `VITE_API_URL`, currently `http://localhost:8080`.

The gateway receives `POST /auth/login` and forwards it to `login-service` through Docker DNS at `http://login-service:5001/auth/login`. This keeps the browser talking to one backend entry point while internal services talk to each other by service name.

## Design Intent

The gateway is intended to be the boundary between the frontend and backend services. The frontend should not need to know every internal service URL. New backend capabilities can be added behind the gateway without changing browser-facing architecture.

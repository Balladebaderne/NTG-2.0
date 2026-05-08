NTG Frontend

Quickstart:
1. npm install
2. npm run start

Local development:
- Open the app at http://localhost:3000 when running Vite directly.
- Vite proxies backend routes such as `/auth`, `/shipments`, and `/tracking` to the Traefik gateway at `http://localhost`.
- Set `BACKEND_URL` if your Traefik gateway runs somewhere else.
- Leave `VITE_BACKEND_URL` unset for same-origin dev proxying.

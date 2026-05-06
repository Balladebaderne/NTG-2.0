# Frontend API Client

`apiGateway.js` is the browser-side client for backend gateway requests. This folder is named
`api` to avoid confusion with the root `Services` directory, which contains backend services.

## How It Works

The module reads `VITE_API_URL` from the Vite environment and falls back to `http://localhost:8080`. The exported `login(credentials)` function sends a JSON `POST` request to:

```text
/auth/login
```

It sends email and password only. The backend login service determines the user's role from its
own user record before signing the JWT. The client parses the JSON response, throws a user-facing
error when the response is not successful, and returns the payload when a JWT token is present.

## How It Connects

`LoginPage.jsx` imports `login` and calls it during form submission. The request goes from the
browser to the gateway, not directly to `login-service`.

## Design Intent

This folder is meant to collect frontend service clients. UI components should call functions here instead of building raw HTTP requests themselves.

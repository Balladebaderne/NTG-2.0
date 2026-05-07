# Frontend Source Architecture

`src` contains the React application code served by Vite.

## Main Files

- `index.jsx` mounts the React app into `index.html`.
- `App.jsx` owns session state and lightweight navigation between `/login` and `/dashboard`.
- `clients/authClient.js` contains the browser-side login request code.
- `pages/LoginPage.jsx` owns the login screen state, form validation, and login submission.
- `pages/DashboardPage.jsx` owns the signed-in placeholder shown after authentication.

## Request Flow

`App.jsx` renders `LoginPage` when no token exists. `LoginPage` imports `login` from `clients/authClient.js`. On form submit, it sends email and password to `/auth/login` through Traefik. The login service determines the user's role from its own user data and includes that role in the signed JWT. If the response includes a JWT, `App.jsx` stores it in `localStorage` under `ntg-login-token`, navigates to `/dashboard`, and renders `DashboardPage`.

## Design Intent

The frontend keeps page-level UI in `pages`, app-level session and navigation in `App.jsx`, and browser-side service calls in `clients`. This avoids scattering `fetch` calls through the UI. Backend roles stay in backend-owned user data, not in a login-page selector.

# Frontend Pages

This folder contains route-level React views.

## Current Pages

- `LoginPage.jsx` is the landing page for signed-out users. It owns the login form state and calls `clients/authClient.login`.
- `DashboardPage.jsx` is the signed-in placeholder page shown after authentication. It only confirms that a JWT session exists.

## Navigation Flow

`App.jsx` decides which page to render:

- No JWT token: render `LoginPage` and use `/login`.
- JWT token exists: render `DashboardPage` and use `/dashboard`.

## Design Intent

Pages own screen-level UI. Shared browser-side service calls remain in `clients`. This keeps `App.jsx` focused on session and navigation orchestration.

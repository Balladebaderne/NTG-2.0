# Prompt: Profile Bar Notification Inbox

Implement a small notification inbox in the signed-in profile bar for NTG role landing pages.

## Context

NTG has a `notificationService` exposed through Traefik at `/notifications`. It creates customer-facing and operations-facing notification records, starting with Shipment delay notifications. Future frontend work will introduce different landing pages after login for roles such as `support`, `logistics`, `driver`, and `admin`.

The inbox should be a compact profile-bar feature, not a full page. It should help relevant roles notice delay messages quickly without interrupting their workflow.

## Goal

Add a reusable `NotificationInbox` UI that appears in the profile bar of role-specific landing pages. It should show unread notification count, open as a small dropdown or popover, list recent notifications, and allow the user to mark notifications as read.

## Relevant Roles

Show the inbox for:

- `support`: CustomerSupportAgents need delay messages so they can contact ReceiverCustomers or adjust Shipment handling.
- `logistics`: Logistical management needs delay messages so they can monitor operational exceptions.
- `admin`: Admin may see it if the admin landing page includes system oversight.

Do not show it by default for:

- `driver`: Drivers should not receive customer-facing delay inbox items unless the backend later introduces driver-specific notification types.

Keep this role gating easy to change. Prefer a small role-to-inbox policy helper over scattering role checks across pages.

## API Contract

Use the existing notification service through frontend client code, not direct fetch calls from page components.

Endpoints:

- `GET /notifications?receiverCustomerId=<id>&unreadOnly=true`
- `GET /notifications`
- `PATCH /notifications/:id/read`

Important: the current backend stores notifications by `receiverCustomerId`. For `support` and `logistics`, the final filtering contract may change to role-based or assignment-based inboxes. Implement the frontend client so the query parameters are centralized and easy to adjust once backend filtering is finalized.

Recommended client shape:

```js
// frontend/src/clients/notificationClient.js
export async function listNotifications({ unreadOnly } = {}) {}
export async function markNotificationRead(notificationId) {}
```

## UI Placement

Place the inbox in the shared signed-in profile bar, near the user's name/role and sign-out control.

Desktop:

- Use an icon button with a notification/bell icon and an unread count badge.
- Open a compact popover aligned to the profile bar.
- Keep the popover width around 320-380px.
- Show 3-5 recent notifications, newest first.

Mobile:

- Keep the trigger in the top bar.
- Open a full-width sheet or anchored panel that does not cause horizontal scrolling.
- Ensure touch targets are at least 44px high.

## Interaction Requirements

- Display an unread badge only when there are unread notifications.
- Poll periodically or refresh when the popover opens. Keep the interval modest, for example 30-60 seconds.
- Show loading, empty, and error states inside the popover.
- Mark a notification read when the user clicks its "mark read" control.
- Do not auto-mark notifications as read just because the popover opened.
- Avoid disruptive browser notifications or modal dialogs for now.

## Notification Item Content

Each item should show:

- Notification title
- Short message
- Created or sent timestamp, formatted for scanning
- Read/unread visual state
- Shipment reference when available

For `shipment_delayed`, the item should make it clear that the affected domain object is a **Shipment**, not an order, package, or delivery.

## Accessibility

- The inbox trigger must have an accessible label such as `Notifications`.
- The unread count must be available to screen readers.
- The popover must be keyboard reachable and dismissible with Escape.
- Focus should move predictably when the popover opens and closes.
- Do not rely on color alone for unread or delayed states.

## Styling Direction

Match the existing NTG dashboard style once the role landing pages exist. This should feel like an operational tool: compact, readable, and calm. Avoid making the inbox look like a marketing card or a full notification center.

Use icons from the project's chosen icon library if one exists by then. If no icon library exists, add one consistently for the frontend rather than mixing inline icon styles.

## Suggested Component Structure

```txt
frontend/src/clients/notificationClient.js
frontend/src/components/ProfileBar.jsx
frontend/src/components/NotificationInbox.jsx
frontend/src/components/NotificationInboxItem.jsx
frontend/src/utils/notificationPolicy.js
```

The exact paths can change if the frontend architecture changes, but keep API calls in `clients`, reusable UI in `components`, and role visibility rules in a small policy helper.

## Acceptance Criteria

- Role landing pages with a profile bar can include a compact notification inbox.
- `support` and `logistics` users see the inbox.
- `driver` users do not see the inbox unless driver-specific notifications are introduced.
- The inbox fetches notifications through `/notifications`.
- The unread badge reflects unread notifications.
- Users can mark notifications as read.
- Empty and error states are handled without breaking the profile bar layout.
- The UI works on desktop and mobile without overlap or horizontal scrolling.

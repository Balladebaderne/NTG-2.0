Below is a **copy-paste-ready prompt** you can give to Codex / Cursor / another AI agent to create a full NTG-inspired frontend design direction.

I based the structure on NTG Denmark’s public page: hero section with “Velkommen til NTG i Danmark,” CTA buttons like “Kontakt os” and “Få et tilbud,” service cards for Vejtransport, Søfragt, Luftfragt, Ekspres, Projekttransport, Fortoldning, Møbellogistik and Lagerløsninger, plus “Hvordan kan vi hjælpe dig” support cards and a large corporate footer. ([NTG.com][1]) NTG also emphasizes that the logo is a core part of their visual identity and should be used consistently and carefully. ([NTG Nordic Transport Group A/S -][2])

````md
# NTG-Inspired Frontend Design Implementation Prompt

You are implementing a professional logistics/customer portal frontend inspired by the visual language of NTG Nordic Transport Group.

The goal is not to blindly copy the public NTG website, but to translate its corporate logistics identity into a modern application interface for three user roles:

1. Customer
2. Driver
3. NTG Operator / Admin

The design must feel like a serious transport, freight, and logistics platform. It should look trustworthy, clean, operational, corporate, and practical. The UI must avoid looking like a generic startup dashboard or playful SaaS app. It should feel like it belongs to a real freight-forwarding company.

---

## 1. Overall Design Direction

The design should be based on the following visual principles:

- Professional logistics company aesthetic
- Clean corporate layout
- Strong use of white space
- Dark blue / navy as the main brand authority color
- Red as a limited action/accent color
- White and light grey backgrounds for readability
- Large hero areas with clear messaging
- Card-based service sections
- Clear call-to-action buttons
- Structured footer/navigation style
- Minimal decoration
- Strong typography hierarchy
- Serious business-to-business tone

The frontend should feel like a bridge between:

- A public NTG-style corporate website
- A customer shipment tracking portal
- A driver event-update interface
- An internal operator/admin dashboard

It should therefore combine public-facing polish with operational clarity.

---

## 2. Color System

Use a restrained corporate palette.

### Primary Colors

Use a deep navy / NTG-like corporate blue as the main identity color.

Suggested values:

- Primary Navy: `#002B5C`
- Dark Navy: `#001F3F`
- Hover Navy: `#003A78`

This color should be used for:

- Header/navigation
- Primary section titles
- Important dashboard panels
- Footer background
- Primary icons
- Active navigation states
- Shipment tracking timeline accents

### Accent Color

Use red as a secondary NTG-style action color.

Suggested values:

- NTG Red: `#D71920`
- Dark Red: `#B5121B`
- Light Red Background: `#FCE8E9`

Red should be used carefully and only for:

- Primary CTA buttons
- Important status warnings
- Critical shipment delays
- “Create shipment” or “Submit event” actions
- Small visual markers

Do not overuse red. It should feel powerful because it is used sparingly.

### Neutral Colors

Use neutral whites and greys for the main interface.

Suggested values:

- Page Background: `#F5F7FA`
- Card Background: `#FFFFFF`
- Soft Section Background: `#EEF2F6`
- Border Grey: `#DDE3EA`
- Text Dark: `#1F2933`
- Text Muted: `#6B7280`
- Text Light: `#9CA3AF`

The platform should never feel too colorful. Most of the interface should be clean, white, grey, and navy.

---

## 3. Typography

Use a modern corporate sans-serif.

Recommended font stack:

```css
font-family: Inter, Arial, Helvetica, sans-serif;
````

Typography should be clear, readable, and serious.

### Heading Rules

Use strong hierarchy:

* H1: 42–56px desktop, bold, tight line-height
* H2: 30–38px, bold
* H3: 22–26px, semibold
* Card titles: 18–20px, semibold
* Body text: 15–17px
* Metadata/status text: 13–14px

Avoid overly rounded, childish, or futuristic fonts.

The writing style should be short and operational:

Good examples:

* “Track your shipment”
* “Create new shipment”
* “Assigned driver”
* “Latest border event”
* “Customer shipment overview”
* “Submit tracking update”

Avoid fluffy text like:

* “Experience logistics like never before”
* “Magical shipment intelligence”
* “Your delivery journey starts here”

---

## 4. Layout Structure

The application should have a strong corporate page structure.

### Public / Customer-Facing Layout

Use this structure:

1. Top navigation
2. Hero section
3. Quick shipment lookup
4. Service overview cards
5. Customer shipment dashboard preview
6. Help / contact cards
7. Footer

The layout should feel similar to a corporate logistics website, where the user immediately understands that this is a serious transport company.

### Authenticated Dashboard Layout

For logged-in users, use an application shell:

* Left sidebar or top navigation
* Main content area
* Role-specific dashboard cards
* Shipment list / table
* Shipment detail panel
* Event timeline
* Status panels

The dashboard should not feel overly decorative. It should prioritize clarity and role-based actions.

---

## 5. Navigation Design

Create a corporate navigation bar inspired by NTG’s public website.

### Desktop Header

The header should contain:

* NTG-style logo area on the left
* Navigation links in the center or right
* Language/account/action area on the far right
* A strong CTA button such as “Få et tilbud” / “Get a quote”

Suggested links:

* Dashboard
* Shipments
* Tracking
* Services
* Support
* Account

For admin/operator:

* Dashboard
* Create shipment
* Customers
* Drivers
* Events
* Reports

For driver:

* My shipments
* Update status
* Route events
* Profile

For customer:

* My shipments
* Track shipment
* Documents
* Contact NTG

### Header Styling

* Height: 72–88px
* White background
* Thin bottom border: `1px solid #DDE3EA`
* Logo area should have breathing room
* Navigation links should be simple text, not boxed
* Active link can use navy underline or navy text
* CTA button should use red background

---

## 6. Hero Section

The hero should resemble a professional NTG corporate landing section.

### Hero Content

Use a large heading such as:

```txt
Transport visibility for every shipment
```

or

```txt
Track, manage and update shipments across the NTG network
```

Subheading:

```txt
A role-based logistics platform for customers, drivers and NTG operators.
Follow shipment events, create orders and keep transport updates connected across the full delivery flow.
```

### Hero Layout

Use a two-column hero on desktop:

Left side:

* H1
* Short paragraph
* Primary CTA
* Secondary CTA

Right side:

* Visual dashboard preview card
* Shipment tracking status preview
* Small event timeline
* Status labels

### Hero Styling

* Background: white or very light grey
* Optional large navy block or gradient behind the preview card
* Use subtle logistics imagery only if available
* Keep it clean and corporate

### Buttons

Primary button:

* Red background
* White text
* Medium border-radius
* Strong hover state

Secondary button:

* White background
* Navy border
* Navy text

Example:

```css
.primary-button {
  background: #D71920;
  color: white;
  border-radius: 6px;
  padding: 12px 22px;
  font-weight: 600;
}

.secondary-button {
  background: white;
  color: #002B5C;
  border: 1px solid #002B5C;
  border-radius: 6px;
  padding: 12px 22px;
  font-weight: 600;
}
```

---

## 7. Card Design

The NTG-inspired design should use many clean cards.

Cards should be rectangular, structured, and professional.

### General Card Rules

* Background: white
* Border: `1px solid #DDE3EA`
* Border-radius: 8–12px
* Shadow: very subtle, not playful
* Padding: 20–28px
* Hover: slight lift or border color change
* No neon colors
* No glassmorphism
* No overly rounded mobile-app feel

Example:

```css
.card {
  background: #FFFFFF;
  border: 1px solid #DDE3EA;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 4px 14px rgba(0, 31, 63, 0.06);
}
```

### Service Cards

Create cards for logistics services:

* Road freight
* Ocean freight
* Air freight
* Express
* Project transport
* Customs
* Furniture logistics
* Warehouse logistics

Each service card should include:

* Image or icon area
* Title
* Short description
* “Read more” / “Læs mere” link

The cards should be arranged in a responsive grid:

* Desktop: 4 columns or 3 columns
* Tablet: 2 columns
* Mobile: 1 column

The cards should feel like NTG’s service overview section: image-led, clean, direct, and structured.

---

## 8. Role-Based Design System

The frontend must clearly support three roles.

Do not create one generic dashboard for everyone. The UI must change based on role.

---

# Customer Role

The customer should be able to:

* View their relevant shipments
* Search by tracking number
* See current shipment status
* See latest event
* See timeline history
* See origin and destination
* See ETA
* See assigned transport/service type
* Contact NTG about a shipment

### Customer Dashboard Layout

Customer dashboard should include:

1. Welcome card
2. Shipment search field
3. Active shipments overview
4. Shipment status cards
5. Shipment timeline
6. Contact/support box

### Customer Shipment Card

Each shipment card should show:

* Tracking number
* Status badge
* Origin
* Destination
* ETA
* Last event
* Button: “View details”

Example visual structure:

```txt
[Tracking ID: NTG-20491]        [In transit]
Copenhagen, DK  →  Hamburg, DE
ETA: 12 May, 14:30
Latest event: Border crossing registered
[View shipment]
```

### Customer Status Colors

Use calm, clear status colors:

* Created: grey
* In transit: navy/blue
* At terminal: muted purple/blue-grey
* Delayed: red/orange
* Delivered: green
* Exception: red

Keep status badges compact and professional.

---

# Driver Role

The driver should only see shipments assigned to them.

The driver can update events on assigned shipments.

The driver should not be able to create shipments.

The driver should not be able to see unrelated customer/admin data.

### Driver Dashboard Layout

Driver dashboard should include:

1. Assigned shipments today
2. Quick event update panel
3. Route list
4. Shipment detail card
5. Event submission form

### Driver Event Form

The form should allow the driver to submit events such as:

* Pickup confirmed
* Departed terminal
* Arrived terminal
* Border crossed
* Delay reported
* Delivered
* Location update
* Damage/exception reported

Fields:

* Shipment selector
* Event type
* Location
* Timestamp
* Notes
* Optional photo/document upload
* Submit button

### Driver UI Style

Driver UI should be more compact and action-focused.

Buttons should be large enough for practical use.

Important buttons:

* “Submit update”
* “Report delay”
* “Mark delivered”
* “Add location event”

Use red only for urgent actions such as delay/exception.

Use navy for normal event submission.

---

# NTG Operator / Admin Role

The operator/admin should be able to:

* Create shipments/orders
* Manage customer shipments
* Assign drivers
* View all events
* View operational status
* Edit shipment data
* Monitor exceptions

### Operator Dashboard Layout

Operator dashboard should include:

1. Operational overview
2. Create shipment button
3. Shipment table
4. Event stream
5. Driver assignment panel
6. Exception/delay panel

### Shipment Table

The shipment table should include:

* Shipment ID
* Customer
* Origin
* Destination
* Driver
* Status
* ETA
* Last event
* Actions

Table styling:

* White background
* Clear column spacing
* Sticky header if possible
* Row hover state
* Status badges
* Action menu

### Create Shipment Form

The form should include:

* Customer
* Origin address
* Destination address
* Service type
* Pickup time
* Delivery estimate
* Assigned driver
* Cargo details
* Notes
* Submit button

Use a multi-section form layout:

1. Customer information
2. Route information
3. Cargo information
4. Driver assignment
5. Confirmation

---

## 9. Shapes and Visual Language

The visual shape system should be restrained.

### Border Radius

Use moderate border-radius:

* Buttons: 6px
* Cards: 8–12px
* Inputs: 6–8px
* Badges: 999px pill shape
* Large containers: 12px

Avoid extreme rounding.

The design should feel corporate, not like a soft consumer app.

### Lines and Dividers

Use thin, clean lines:

```css
border: 1px solid #DDE3EA;
```

Use dividers between:

* Table rows
* Timeline events
* Form sections
* Sidebar groups
* Footer columns

### Shadows

Use very subtle shadows:

```css
box-shadow: 0 4px 14px rgba(0, 31, 63, 0.06);
```

Avoid heavy drop shadows.

The UI should feel flat-professional, not floating/mobile-like.

---

## 10. Forms and Inputs

Forms should feel serious and operational.

### Input Styling

```css
.input {
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  padding: 11px 13px;
  font-size: 15px;
  background: white;
}
```

Focus state:

```css
.input:focus {
  border-color: #002B5C;
  box-shadow: 0 0 0 3px rgba(0, 43, 92, 0.12);
}
```

### Form Layout

Use labels above fields.

Do not rely only on placeholders.

Good:

```txt
Tracking number
[ NTG-20491 ]
```

Bad:

```txt
[ Enter tracking number here... ]
```

### Validation

Use clear validation messages:

* “Tracking number is required”
* “Driver must be assigned before shipment can be activated”
* “Only assigned drivers can update this shipment”

Use red for errors, but keep it controlled.

---

## 11. Timeline Design

Shipment tracking needs a strong event timeline.

The timeline should show the full logistics history.

### Timeline Event Card

Each event should include:

* Event type
* Timestamp
* Location
* Source/actor
* Notes
* Optional metadata

Example:

```txt
Border crossed
Padborg, Denmark
8 May 2026, 10:42
Submitted by: Driver
```

### Timeline Visuals

Use:

* Vertical line
* Circular event markers
* Navy for normal events
* Red for exceptions
* Green for delivered
* Grey for pending/future events

Timeline should be readable and not over-designed.

---

## 12. Dashboard Boxes

Use summary boxes at the top of dashboards.

Examples for operator:

* Active shipments
* Delayed shipments
* Drivers on route
* Events today
* Delivered today

Examples for customer:

* Active shipments
* Delivered shipments
* Delayed shipments
* Awaiting pickup

Examples for driver:

* Assigned today
* Completed stops
* Pending updates
* Reported exceptions

### Summary Box Style

```txt
+----------------------+
| Active shipments     |
| 128                  |
| +12 today            |
+----------------------+
```

Styling:

* White card
* Navy number
* Muted label
* Small icon
* Optional red warning if critical

---

## 13. Icons and Imagery

Use simple logistics-related icons.

Possible icon categories:

* Truck
* Ship
* Plane
* Warehouse
* Box/package
* Map pin
* Route
* Clock
* Checkmark
* Warning triangle
* User/driver
* Document

Icons should be:

* Line-based
* Navy or grey
* Red only for alerts/actions
* Consistent stroke width

Do not mix icon styles.

If using images, they should be:

* Freight/logistics related
* Corporate
* High contrast
* Not overly stock-photo playful
* Cropped cleanly inside cards

---

## 14. Footer Design

Create a large corporate footer inspired by NTG’s structure.

Footer should include:

* Logo / company summary
* Services column
* Company column
* Contact column
* Address block
* Legal links

Use dark navy background.

Footer text:

* White for headings
* Light grey for links
* Red accent line or hover state

Example structure:

```txt
NTG Nordic Transport Group

Services
- Road freight
- Ocean freight
- Air freight
- Express
- Warehouse logistics

Company
- About
- Organisation
- Careers
- Press

Contact
- Contact us
- NTG offices
- Support

Address
Hammerholmen 47
DK-2650 Hvidovre
Denmark
```

---

## 15. UI Tone and Copywriting

The language should be concise, professional, and operational.

Use Danish if the site is for Denmark.

Good Danish labels:

* Forsendelser
* Spor forsendelse
* Opret forsendelse
* Tildelte ture
* Seneste hændelse
* Leveringsstatus
* Forventet levering
* Kontakt NTG
* Indsend statusopdatering
* Rapportér forsinkelse
* Kundeoverblik
* Chaufføroverblik
* Driftsstatus

Avoid overly casual wording.

---

## 16. Role-Based Access Visual Logic

The frontend must visually communicate permissions.

### Driver

Driver sees:

* Assigned shipments only
* Event update actions
* No create-shipment button
* No customer management
* No admin tables

### Customer

Customer sees:

* Own shipments only
* Tracking timeline
* Support/contact
* No driver assignment
* No shipment creation unless explicitly allowed
* No internal events beyond customer-safe information

### Operator/Admin

Operator/Admin sees:

* All shipments
* Create/edit shipment
* Assign driver
* View events
* Manage operational data

The frontend should not only hide buttons. It should have role-specific pages and navigation.

---

## 17. Suggested Page List

Create these pages:

### Public

* `/`
* `/services`
* `/track`
* `/contact`

### Auth

* `/login`

### Customer

* `/customer/dashboard`
* `/customer/shipments`
* `/customer/shipments/:id`
* `/customer/support`

### Driver

* `/driver/dashboard`
* `/driver/assigned-shipments`
* `/driver/shipments/:id/update`
* `/driver/events`

### Operator/Admin

* `/operator/dashboard`
* `/operator/shipments`
* `/operator/shipments/create`
* `/operator/shipments/:id`
* `/operator/drivers`
* `/operator/customers`
* `/operator/events`

---

## 18. Component List

Implement reusable components:

* `AppShell`
* `PublicHeader`
* `DashboardHeader`
* `Sidebar`
* `RoleNavigation`
* `HeroSection`
* `ServiceCard`
* `ShipmentCard`
* `ShipmentTable`
* `StatusBadge`
* `Timeline`
* `TimelineEvent`
* `DashboardStatCard`
* `TrackingSearch`
* `CreateShipmentForm`
* `DriverEventForm`
* `SupportCard`
* `Footer`

Each component should follow the same design system.

---

## 19. Implementation Style

Use clean, direct CSS.

Avoid unnecessary abstraction.

Prefer readable component files.

The implementation should be easy to explain in an exam or project defense.

Each role must have a clear interface and clear responsibility.

The frontend should demonstrate:

* Role-based UI
* Shipment tracking
* Event-driven data display
* Operational clarity
* Customer-facing tracking
* Driver event updates
* Operator shipment creation

---

## 20. Final Design Requirement

The final frontend must feel like:

“A real NTG-style logistics portal where customers can track shipments, drivers can update assigned shipment events, and operators/admins can create and manage shipments.”

It should not feel like:

* A generic school project
* A random CRUD dashboard
* A colorful SaaS template
* A mobile game UI
* A loose prototype without corporate identity

Every visual choice should support:

* Trust
* Logistics clarity
* Role separation
* Operational overview
* Professional transport-company branding

```

Use this as the **master design prompt**. It tells the AI not only what to build, but also **why each visual choice matters**: navy for authority, red for action, white cards for clarity, controlled boxes for logistics data, timelines for event flow, and role-specific layouts for customer/driver/operator separation.
::contentReference[oaicite:2]{index=2}
```

[1]: https://country.ntg.com/da/ "NTG i Danmark - NTG.com"
[2]: https://ntg.com/about/press/ntg-logo/?utm_source=chatgpt.com "NTG press images - NTG Nordic Transport Group A/S"

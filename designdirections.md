Yes — then the prompt should be **pure design direction**, not functionality or role logic.

Here is a cleaner version focused only on the shared visual language: colors, boxes, layout, spacing, typography, shapes, hierarchy, NTG-inspired corporate feel.

````md
# NTG-Inspired Visual Design Direction Prompt

Create a frontend design direction inspired by the public NTG Nordic Transport Group website.

This prompt is only about the shared visual design language. Do not focus on individual user roles, permissions, or specific workflows. The goal is to define the common look, feel, layout logic, color system, spacing, typography, components, and general UI style that should apply across the entire application.

The design should feel like a professional logistics, freight, transport, and corporate operations platform.

It should look serious, trustworthy, clean, practical, and business-oriented.

It should not look like a playful SaaS dashboard, a colorful startup app, or a generic school project.

---

## 1. Overall Visual Identity

The interface should be based on a corporate logistics aesthetic.

The design should communicate:

- Trust
- Stability
- Transport expertise
- Operational clarity
- Professionalism
- Structure
- Control
- Efficiency

The visual feeling should be close to:

- Corporate freight company
- Logistics management platform
- Transport operations portal
- Business customer web application
- Clean Nordic company website

The UI should feel like it belongs to a real company, not like a prototype.

The public NTG site uses a clean corporate structure with large sections, strong white space, professional service cards, clear CTA buttons, and a serious visual tone. This same feeling should be translated into the application design.

---

## 2. Color Direction

Use a restrained corporate color palette.

The main design should be built around:

- Deep navy
- White
- Light grey
- Muted grey-blue
- Controlled red accents

The color system should feel professional and stable.

### Main Colors

Use deep navy as the core identity color.

Suggested values:

```css
--color-primary-navy: #002B5C;
--color-dark-navy: #001F3F;
--color-hover-navy: #003A78;
````

Use navy for:

* Headers
* Main navigation
* Important titles
* Active states
* Section emphasis
* Timeline markers
* Icons
* Large corporate blocks
* Footer areas

Navy should give the interface authority and seriousness.

---

### Accent Color

Use red as the strongest accent color.

Suggested values:

```css
--color-accent-red: #D71920;
--color-accent-red-dark: #B5121B;
--color-accent-red-soft: #FCE8E9;
```

Red should be used sparingly.

Use red for:

* Primary CTA buttons
* Important active actions
* Small accent lines
* Warning or exception states
* Highlighted UI details

Red should not dominate the interface.

The design should mostly be white, grey, and navy. Red should appear only where the user’s attention is needed.

---

### Neutral Colors

Use neutral backgrounds and borders.

Suggested values:

```css
--color-page-bg: #F5F7FA;
--color-section-bg: #EEF2F6;
--color-card-bg: #FFFFFF;
--color-border: #DDE3EA;
--color-border-strong: #CBD5E1;
--color-text-main: #1F2933;
--color-text-muted: #6B7280;
--color-text-light: #9CA3AF;
```

The interface should avoid heavy contrast except in key brand areas.

Most content surfaces should be white cards on a soft grey background.

---

## 3. Typography Direction

Use a clean, modern sans-serif font.

Recommended stack:

```css
font-family: Inter, Arial, Helvetica, sans-serif;
```

Typography should feel:

* Sharp
* Professional
* Easy to scan
* Corporate
* Practical

Avoid decorative, overly rounded, futuristic, or playful fonts.

### Typography Scale

Use clear visual hierarchy:

```css
--font-h1: 48px;
--font-h2: 36px;
--font-h3: 24px;
--font-card-title: 18px;
--font-body: 16px;
--font-small: 14px;
--font-meta: 13px;
```

Suggested hierarchy:

* H1: large, bold, corporate
* H2: strong section heading
* H3: clear subsection heading
* Card titles: semibold
* Body text: regular, readable
* Labels/metadata: smaller and muted

Line height should be comfortable.

```css
line-height: 1.45;
```

The interface should not feel cramped, but it should also not waste space.

---

## 4. Layout Direction

The layout should use large, clean structural sections.

The design should be based on:

* Strong header
* Spacious hero or page header areas
* Card grids
* Clear content sections
* Tables or list panels where needed
* Corporate footer
* Consistent max-width container

Use a central page container:

```css
.container {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 24px;
}
```

For wider dashboard layouts, allow:

```css
.dashboard-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 32px;
}
```

The layout should feel balanced and intentional.

Do not let content float randomly.

Every section should have a clear beginning, middle, and end.

---

## 5. Spacing System

Use a consistent spacing scale.

Suggested spacing tokens:

```css
--space-4: 4px;
--space-8: 8px;
--space-12: 12px;
--space-16: 16px;
--space-20: 20px;
--space-24: 24px;
--space-32: 32px;
--space-40: 40px;
--space-56: 56px;
--space-72: 72px;
--space-96: 96px;
```

Use larger spacing between major sections.

Use tighter spacing inside data-heavy areas.

General spacing rules:

* Page sections: 72–96px vertical spacing
* Card grids: 24–32px gap
* Card internal padding: 20–28px
* Form field spacing: 16–20px
* Table row padding: 14–18px
* Header height: 72–88px

The UI should feel roomy but not empty.

---

## 6. Header / Navigation Direction

The header should feel like a corporate transport company navigation bar.

It should be clean, white, structured, and professional.

### Header Style

Use:

```css
.header {
  height: 80px;
  background: #FFFFFF;
  border-bottom: 1px solid #DDE3EA;
}
```

The header should include:

* Logo area on the left
* Simple navigation links
* Optional right-side action button
* Clear active state

Navigation links should be text-based, not placed inside heavy boxes.

Active links can use:

* Navy text
* Red underline
* Navy underline
* Subtle background tint

The header should not be too tall, too decorative, or too app-like.

---

## 7. Hero / Page Header Direction

Major pages should start with a strong hero or page header section.

This area should create immediate structure and context.

### Hero Style

The hero should use:

* Large heading
* Short explanatory text
* One or two action buttons
* Optional preview card or visual panel
* White or light grey background
* Optional navy block for contrast

Example structure:

```txt
[Large heading]
[Short supporting text]

[Primary button] [Secondary button]

[Optional preview card / image / status panel]
```

The hero should feel professional and calm.

Avoid oversized marketing fluff.

The design should be clear and direct.

---

## 8. Buttons

Buttons should be rectangular with slightly rounded corners.

Do not use pill-shaped buttons everywhere.

### Primary Button

Use red for the main action.

```css
.button-primary {
  background: #D71920;
  color: #FFFFFF;
  border: 1px solid #D71920;
  border-radius: 6px;
  padding: 12px 22px;
  font-weight: 600;
}
```

Hover:

```css
.button-primary:hover {
  background: #B5121B;
  border-color: #B5121B;
}
```

### Secondary Button

Use white with navy border.

```css
.button-secondary {
  background: #FFFFFF;
  color: #002B5C;
  border: 1px solid #002B5C;
  border-radius: 6px;
  padding: 12px 22px;
  font-weight: 600;
}
```

### Neutral Button

Use light grey/white for low-priority actions.

```css
.button-neutral {
  background: #F5F7FA;
  color: #1F2933;
  border: 1px solid #DDE3EA;
  border-radius: 6px;
}
```

Button rules:

* Primary action: red
* Secondary action: navy/white
* Neutral action: grey/white
* Dangerous action: red outline or red soft background
* Do not use too many red buttons on one screen

---

## 9. Cards and Boxes

Cards are a central part of the design.

Use cards for:

* Service sections
* Status summaries
* Information groups
* Dashboard panels
* Forms
* Tables
* Contact/help blocks
* Timeline/event groups

### Card Style

```css
.card {
  background: #FFFFFF;
  border: 1px solid #DDE3EA;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 4px 14px rgba(0, 31, 63, 0.06);
}
```

Cards should feel solid and structured.

They should not be overly soft, glassy, or decorative.

### Card Hover

```css
.card:hover {
  border-color: #CBD5E1;
  box-shadow: 0 6px 18px rgba(0, 31, 63, 0.09);
}
```

Hover states should be subtle.

The design should feel serious, not animated for fun.

---

## 10. Box Shapes

Use moderate corner rounding.

Suggested border radius system:

```css
--radius-small: 6px;
--radius-medium: 10px;
--radius-large: 14px;
--radius-pill: 999px;
```

Use:

* Buttons: 6px
* Inputs: 6–8px
* Cards: 10px
* Large panels: 12–14px
* Badges: pill shape

Do not use extreme rounded cards.

Do not use sharp 0px corners everywhere either.

The design should be modern but still corporate.

---

## 11. Borders and Dividers

Use thin borders to create structure.

```css
border: 1px solid #DDE3EA;
```

Use dividers for:

* Table rows
* Form sections
* Dashboard panels
* Timeline items
* Navigation groups
* Footer columns

Dividers should be subtle.

The UI should not look boxed-in everywhere, but it should have enough structure to feel organized.

---

## 12. Shadows

Use very light shadows.

Suggested shadow system:

```css
--shadow-small: 0 2px 8px rgba(0, 31, 63, 0.05);
--shadow-medium: 0 4px 14px rgba(0, 31, 63, 0.06);
--shadow-large: 0 10px 28px rgba(0, 31, 63, 0.10);
```

Use shadows only to gently separate surfaces.

Avoid:

* Heavy shadows
* Floating mobile-app look
* Neumorphism
* Glassmorphism
* Overly dramatic depth

---

## 13. Service Card Direction

The service-card style should be inspired by NTG’s public service sections.

Cards should be image-led or icon-led.

Each service card should have:

* Image/icon area
* Clear title
* Short description
* Small link or action text

The card should feel like a professional business offering, not a product tile.

### Service Card Structure

```txt
+-----------------------------+
| [Image/Icon Area]            |
|                             |
| Service Title               |
| Short description text      |
|                             |
| Read more →                 |
+-----------------------------+
```

Use a responsive grid.

Desktop:

```css
grid-template-columns: repeat(3, 1fr);
gap: 24px;
```

Large desktop can use 4 columns where appropriate.

Mobile should collapse to 1 column.

---

## 14. Data Cards / Summary Boxes

Use compact summary boxes for important numbers or key information.

They should look like corporate dashboard panels.

### Summary Box Style

```css
.summary-card {
  background: #FFFFFF;
  border: 1px solid #DDE3EA;
  border-radius: 10px;
  padding: 20px;
}
```

Inside the box:

* Small muted label
* Large navy number or value
* Small supporting text
* Optional icon

Example structure:

```txt
+----------------------+
| Active shipments     |
| 128                  |
| +12 today            |
+----------------------+
```

The number/value should be visually dominant.

The label should be muted.

---

## 15. Tables and Lists

Tables should be clean and operational.

Use them when information needs comparison or scanning.

### Table Style

```css
.table-wrapper {
  background: #FFFFFF;
  border: 1px solid #DDE3EA;
  border-radius: 10px;
  overflow: hidden;
}
```

Table header:

```css
.table th {
  background: #F5F7FA;
  color: #1F2933;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
```

Table rows:

```css
.table td {
  padding: 14px 16px;
  border-top: 1px solid #DDE3EA;
}
```

Row hover:

```css
.table tr:hover {
  background: #F8FAFC;
}
```

Tables should be readable, not cramped.

Avoid excessive borders.

---

## 16. Forms and Inputs

Forms should be simple, serious, and clear.

Every input should have a visible label.

Do not rely only on placeholder text.

### Input Style

```css
.input {
  width: 100%;
  background: #FFFFFF;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  padding: 11px 13px;
  font-size: 15px;
  color: #1F2933;
}
```

Focus state:

```css
.input:focus {
  outline: none;
  border-color: #002B5C;
  box-shadow: 0 0 0 3px rgba(0, 43, 92, 0.12);
}
```

Labels:

```css
.label {
  font-size: 14px;
  font-weight: 600;
  color: #1F2933;
  margin-bottom: 6px;
}
```

Forms should be grouped into clear sections.

Use light dividers between form groups.

---

## 17. Badges and Status Labels

Badges should be small and readable.

Use pill shapes for compact labels.

```css
.badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 13px;
  font-weight: 600;
}
```

Suggested badge colors:

```css
.badge-blue {
  background: #E6F0FA;
  color: #002B5C;
}

.badge-red {
  background: #FCE8E9;
  color: #B5121B;
}

.badge-grey {
  background: #EEF2F6;
  color: #4B5563;
}

.badge-green {
  background: #E6F4EA;
  color: #166534;
}
```

Badges should support scanning.

Do not make badges huge or overly decorative.

---

## 18. Timeline / Event Visual Direction

Where a timeline is needed, it should be clean and logistics-oriented.

Use:

* Vertical line
* Small circular markers
* Clear timestamp
* Short event title
* Location/detail text
* Muted metadata

### Timeline Style

```css
.timeline {
  border-left: 2px solid #DDE3EA;
  padding-left: 20px;
}
```

Marker:

```css
.timeline-marker {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #002B5C;
}
```

Use navy for normal events.

Use red for exceptions or critical events.

Use grey for inactive/pending events.

The timeline should not feel like a social feed. It should feel like an operational log.

---

## 19. Icon Direction

Use consistent line icons.

Icons should feel:

* Simple
* Technical
* Logistics-related
* Corporate
* Minimal

Recommended icon style:

* 1.5px to 2px stroke
* No filled cartoon icons
* No mixed icon packs
* Navy, grey, or red only

Icon themes:

* Truck
* Ship
* Plane
* Warehouse
* Box
* Route
* Map pin
* Clock
* Checkmark
* Warning
* Document
* User
* Search
* Filter

Icons should support understanding, not decorate randomly.

---

## 20. Image Direction

Images should be used carefully.

If using imagery, use:

* Freight vehicles
* Warehouses
* Ports
* Trucks
* Containers
* Corporate logistics scenes
* Clean industrial environments

Avoid:

* Random stock business people
* Overly happy startup imagery
* Cartoon illustrations
* Heavy gradients over photos
* Low-resolution images

Images should be cropped cleanly and integrated into card layouts.

Use a consistent image ratio, for example:

```css
aspect-ratio: 16 / 9;
object-fit: cover;
```

---

## 21. Backgrounds

Use backgrounds to divide major sections.

Recommended background structure:

* Main page: light grey
* Cards: white
* Header: white
* Footer: dark navy
* Hero: white or very light grey
* Highlight sections: soft grey-blue

Example:

```css
.page {
  background: #F5F7FA;
}

.section-white {
  background: #FFFFFF;
}

.section-soft {
  background: #EEF2F6;
}

.section-dark {
  background: #001F3F;
  color: #FFFFFF;
}
```

Avoid noisy backgrounds.

Avoid patterns unless they are extremely subtle.

---

## 22. Footer Direction

The footer should feel like a large corporate company footer.

Use dark navy background.

```css
.footer {
  background: #001F3F;
  color: #FFFFFF;
  padding: 56px 0 32px;
}
```

Footer columns should include:

* Company information
* Services
* Contact
* Legal links
* Office/address information

Footer links should be light grey.

```css
.footer a {
  color: #CBD5E1;
}
```

Hover state:

```css
.footer a:hover {
  color: #FFFFFF;
}
```

Use a small red accent line if needed.

The footer should feel grounded and corporate.

---

## 23. Motion and Interaction

Use minimal interaction.

Allowed:

* Subtle hover lift on cards
* Button hover color change
* Smooth dropdowns
* Soft focus rings
* Small icon movement on hover

Avoid:

* Bouncy animations
* Overly playful transitions
* Excessive loading effects
* Animated gradients
* Confetti
* Game-like UI motion

Suggested transition:

```css
transition: all 160ms ease;
```

The interface should feel responsive, but not flashy.

---

## 24. Overall Component Feel

All components should share the same visual DNA:

* White surfaces
* Navy identity
* Red accent
* Thin grey borders
* Moderate rounding
* Subtle shadows
* Clear text hierarchy
* Plenty of spacing
* Serious corporate layout

Nothing should feel disconnected.

A button, card, table, form, footer, and header should all look like they belong to the same logistics company.

---

## 25. Design Things to Avoid

Avoid the following:

* Bright startup gradients
* Purple/blue SaaS templates
* Random colorful status cards
* Oversized rounded corners
* Glassmorphism
* Neon effects
* Cartoon icons
* Heavy shadows
* Unstructured white space
* Generic dashboard templates
* Too many colors
* Text that sounds like marketing fluff
* Overly playful animations
* Cluttered tables
* Weak visual hierarchy

The design should not feel experimental.

It should feel proven, trustworthy, and practical.

---

## 26. Final Visual Goal

The final frontend should look like:

A polished NTG-inspired logistics web platform with a shared professional design system.

It should feel like:

* A real transport company platform
* A business logistics interface
* A corporate operations system
* A clean Nordic freight website translated into an application UI

The design must be consistent across all pages.

Every page should use the same:

* Color system
* Button style
* Card style
* Typography
* Border radius
* Shadows
* Spacing
* Navigation logic
* Footer style
* Corporate tone

The final impression should be:

“This belongs to a serious logistics company.”

```

This version removes the role-specific breakdown and focuses only on the **shared NTG-like visual direction** that should apply everywhere.
```

---
name: myta-crm-product-ux
description: Design scientific, task-based, accessible MYTA CRM navigation, settings and responsive business workflows in Vue 3 + Vuetify.
---
# MYTA CRM – Product UX & frontend engineering
Use when the active task touches UI, navigation, dashboards, interaction logic or brand.
1. Read root AGENTS.md, docs/codex/UX-IA.md, current route/sidebar map and source. Inventory all routes before redesign.
2. Reuse the exact brand artwork in frontend/public/brand/myta-logo.png and myta-favicon.png. Brand product name MYTA CRM, never Zalocrm. Do not recolor logos or create lookalike marks.
3. Design information architecture first: max seven top-level workflow groups; Settings is a proper hub with organization, users, channels, automation, web widgets, security, brand and future billing. No duplicate menu nodes.
4. Build UX as user journeys, not a pile of pages: clear entry→action→feedback→history→settings. Show how each module connects to customer, channel, project.
5. Use native Vue/Vuetify components and shared theme tokens; modular components, typed composables; accessibility (landmarks, focus, keyboard, minimum 40px touch target), responsive 360/390/768/1280.
6. Every form/table must show loading, empty, error, permission and success states; avoid phantom settings, fake metrics, placeholder integration badges.
7. Build frontend with npm run build. Inspect in browser if available and report true screenshots/viewport checks; do not claim UX QA from TypeScript build alone.
8. Keep feature parity and existing working routes, add redirects on moves. Document UI changes and a navigation tree.

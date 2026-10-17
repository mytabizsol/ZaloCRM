---
name: myta-crm-backend
description: Engineer and verify secure multi-tenant Fastify, Prisma/PostgreSQL CRM modules, project workflows and channel integrations.
---
# MYTA CRM – Backend & integration engineering
Use for project management, CRM domains, channels, APIs, schema changes or background jobs.
1. Inspect backend/src/modules, backend/src/app.ts, backend/prisma/schema.prisma. Follow existing types, naming and module boundaries, prefer independent original implementations informed by OSS.
2. Add endpoints scoped by request.user.orgId; validate all linked IDs to same tenant. Owner/admin/project member rules verified server-side, not just hidden in UI.
3. Database: use reviewed additive SQL/Prisma migrations, capture and verify backup before deployment, never remove production records or execute db push --accept-data-loss.
4. All mutations validate schema, enforce RBAC, audit important transitions, use bounded pagination, rate limiting for public endpoints, idempotency for external actions.
5. Channel APIs: official authorized tokens/webhook signature, no scraping private data, do not infer success from accepted asynchronous response, never log secrets.
6. Dependencies licensed/version pinned; never import AGPL/GPL/enterprise code into a different-license product without audited compliance. Learning patterns and writing original implementation is encouraged.
7. Test success, invalid input, forbidden role, cross-org references and retry/failure path. Report exact commands and environment.
8. Run build and tests; never declare deployed solely because a build passed. No production migrations without explicit task approval.

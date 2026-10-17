---
name: myta-crm-qa
description: Verify full-stack MYTA CRM changes, frontend responsive behavior, security boundaries and safe deployment with reproducible evidence.
---
# MYTA CRM – Quality gates
1. Read AGENTS.md and docs/codex/PROGRESS.md; define acceptance criteria before implementation.
2. Validate frontend build and backend TypeScript; inspect latest Prisma migration and status, Docker logs and health when deployment is in scope.
3. Test authenticated CRUD, role matrix, cross-org IDOR, validation, empty/loading/error, rate limits, duplicate/idempotent operations and backup/rollback.
4. UI: 360/390/768/1280 widths, keyboard-only, focus, contrast, responsive drawer, long Vietnamese text, timezone, no horizontal overflow.
5. Browser/browser automation verification when available; collect screenshots and compare with brand/UX brief. If not available, mark NOT TESTED.
6. For social APIs, label states: local-only/scaffolded, configured, authorized, provider accepted, published and verified. Never conflate.
7. Maintain docs/codex/PROGRESS.md step-by-step with exact commands, outputs, files, known issues, commit and next tasks.
8. End each Codex invocation after one complete scoped step, do not auto-loop or deploy without permission.

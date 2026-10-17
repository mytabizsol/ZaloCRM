# MYTA CRM — Codex Autopilot

Owner authorized uninterrupted, **bounded task-by-task** Codex development as of 17/10/2026. Workers are invoked independently by `runner.mjs` on Windows device Marketing01. The user is not required to approve every step.

## Operation

- Automatic launcher: `start.ps1`; Windows Task Scheduler checks once per hour and starts the runner when missing.
- Status: `powershell -File tools/codex-autopilot/status.ps1`, or inspect `D:\Apps\ZaloCRM-autopilot\state.json` and `autopilot.log`.
- Pause: `powershell -File tools/codex-autopilot/stop.ps1` (finishes current step, then stops).
- Emergency stop including current worker: `powershell -File tools/codex-autopilot/stop.ps1 -Force`.
- Resume: remove `D:\Apps\ZaloCRM-autopilot\STOP`; if prior state is `blocked` or `fatal`, inspect logs, fix cause, then clear/reset state manually after resolving source changes. Do not just blindly restart failed runs.
- Dry-run (no API calls): `node tools/codex-autopilot/runner.mjs --dry-run`.

## Limits and policy

- GPT-5.6 Terra, reasoning High; at most 3 Codex invocations each Vietnam calendar day; 35-minute coding cap, 20-minute Docker build cap; at most 1 repair attempt per step and a 90-second cooldown.
- One worker at a time. Each worker edits one `STEP-XX` defined by `docs/codex/TASKS.md`. Dependencies must be code-complete before next step. Dependent external provider steps wait for approved credentials and permissions.
- Code changes are validated with `git diff --check` and `docker compose build app` outside Codex sandbox. Changes are committed and pushed only to `feature/upstream-v34-integration`. Full end-to-end provider behavior is never inferred from a successful build.
- **Never** merge to main, deploy the app, run live DB schema migrations, perform irreversible DB deletions, send messages, post content, purchase services or change Odoo under this unattended runner.
- Data backups are taken before schema-sensitive stages and verified for nontrivial size. Database runs under Docker with existing backups.
- The supervisor stops on unclean repository, unexpected branch, missing migration, exceeded time, failed build after repair, invalid credentials or unavailable dependent permissions. It records why in status/log. No ChatGPT notifications are scheduled.
- This is not an infinite free background service: work continues **only while Marketing01 is running and Codex quota/auth/network allow**. An hourly scheduled check handles interruptions, but stops on unsafe errors. Estimated token usage may still be significant at Terra High.

## Definition of Done

The supervisor marks `DONE` meaning feature-branch source passes build and machine checks, **not** customer acceptance or verified integration with external API. Missing real provider credentials, mobile UX and staging end-to-end tests remain in `STEP-17` until verified. Do not claim otherwise.

## Development state

- Codebase `D:\Apps\ZaloCRM`; Autopilot state/logs/backups `D:\Apps\ZaloCRM-autopilot`.
- Remote GitHub branch: `feature/upstream-v34-integration`.
- Current implementation: MYTA CRM frontend rebrand; next: STEP-01 projects backend and STEP-02 UI.

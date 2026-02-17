# SKOpi Changelog

This file tracks material product/rules changes for public verification.

## 2026-02-17 — V2 FCFS Airdrop Foundation

### Added
- FCFS allocation enforcement at DB layer via `supabase/airdrop_v2_fcfs.sql`
- Campaign `distributed_tokens` tracking
- `airdrop_claim_fcfs(...)` function with lock-based anti-race behavior
- Public active campaigns endpoint with remaining pool visibility
- Claim endpoint and wallet allocation lookup endpoint
- Admin tasks API + UI for bounty task creation
- Submission workflow and manual review queue (approve/reject)

### Why
- Ensure transparent, deterministic first-come-first-served distribution under a fixed pool.
- Provide auditable, public logic path from rule -> SQL -> API -> UI.

### User Impact
- Users can claim allocations under pool constraints.
- Manual-review tasks require admin approval before allocation.

### Notes
- Real-money testing intentionally deferred during this phase.
- See `docs/transparency-workflow.md` for verification process.

## 2026-02-17 — Airdrop Admin/Ops Hardening + Rule Controls

### Added
- Bulk submission approve/reject actions in admin queue.
- Reconciliation endpoint + admin report UI (`distributed_tokens` drift checks).
- CSV export endpoints for submissions, allocations, campaigns.
- Submission idempotency + lifecycle integrity controls:
  - `client_submission_id`
  - strict state transition trigger
  - state versioning / timestamp tracking
- DB-driven task verifier rules:
  - `allowed_domains`
  - `requires_https`
  - `min_evidence_length`
- Admin task editing flow (PATCH) + one-click task enable/disable.
- Supabase allowlist-based admin auth helper with legacy token fallback.
- Consolidated migration bundle:
  - `supabase/migrations_bundle/airdrop_v2_all_pending.sql`

### Why
- Improve ops safety, anti-abuse resilience, and production maintainability.
- Reduce migration friction with one-run bundle for new or lagging environments.

### User Impact
- Users receive safer, more predictable submission validation.
- Admins can operate faster (bulk actions, reconcile, exports, task toggles/edits).

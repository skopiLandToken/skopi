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

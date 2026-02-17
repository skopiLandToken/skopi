# SKOpi Transparency Workflow (Public Verifiability)

Goal: make it easy for anyone to verify that SKOpi does what it claims.

## Principles
- Public-by-default for product logic, tokenomics logic, and allocation rules.
- Private-by-default for secrets and abuse-defense internals.
- Every user-impacting rules change must be visible in git history + release notes.

## What must be public
1. **Airdrop logic and schemas**
   - `supabase/airdrop_v2_schema.sql`
   - `supabase/airdrop_v2_fcfs.sql`
   - API routes under `src/app/api/airdrop/*` and `src/app/api/admin/airdrop/*` (except secrets)
2. **Token economics docs**
   - fixed supply policy
   - redemption policy (`1 SKOpi = $1 discount`)
   - burn policy (`100% burn` on redemption)
3. **Operational docs**
   - release changelog
   - incident log (if logic bugs are found)
   - known limitations and roadmap

## What must stay private
- `.env*` files, service keys, admin tokens, webhook secrets
- wallet signing/private keys
- anti-abuse thresholds and hidden heuristics that would help attackers bypass checks

## Required repo practices
1. **Signed, named releases** for important milestones
   - Example tags: `v2-airdrop-fcfs`, `v2-submissions-review`
2. **No force-push to main** after public launch
3. **Every rule change gets a migration + note**
   - If allocation logic changes, add SQL migration and changelog entry.
4. **Proof bundle per release**
   - commit SHA
   - deployed app URL
   - DB migration filenames applied
   - treasury address in effect

## Public verification checklist (share with community)
When someone asks “how do we know this is true?”, point them to:

1. GitHub release tag + commit SHA
2. SQL migration implementing the rule
3. API route calling that logic
4. Live endpoint behavior example (request + response)
5. On-chain evidence where applicable (tx signatures, burn logs)

## Token launch transparency workflow (when token contract is ready)
1. Publish token contract/program source in repo under `contracts/` or `programs/`.
2. Publish deployment config and immutable parameters in `docs/token-launch.md`.
3. Tag release `token-launch-v1`.
4. Publish canonical addresses:
   - mint address
   - treasury
   - authority/upgrade authority status
5. Publish verification instructions (step-by-step) for independent reproduction.
6. Add post-launch attestation note with links to chain explorers.

## Change management template
For each material change, create a short note in `docs/changelog.md`:
- Date
- What changed
- Why
- Affected endpoints/migrations
- User impact
- Rollback plan

## Current status
- FCFS pool allocation implemented at DB level (`airdrop_claim_fcfs`) with row lock.
- Campaign/task/submission/manual-review flows are implemented and visible in code.
- Next transparency hardening step: add `docs/changelog.md` and publish first release tag.

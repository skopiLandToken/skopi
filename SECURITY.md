# Security Policy

## Supported Scope
This repository is public for transparency of SKOpi product logic.

Public scope includes:
- Airdrop and allocation logic
- SQL migrations and schema files
- API route behavior
- Tokenomics documentation and changelog

Private scope (never commit):
- `.env*` files
- Supabase service role keys
- Admin tokens
- Signing keys / seed phrases / private keys
- Internal infrastructure IPs or sensitive host details

## Reporting a Vulnerability
If you discover a security issue, do **not** post exploit details publicly first.

Please report privately to project maintainers with:
- Impact summary
- Reproduction steps
- Affected files/endpoints
- Suggested mitigation (optional)

Maintainers will acknowledge, patch, and publish a responsible disclosure note in `docs/changelog.md`.

## Hard Rules
- No secrets in git history.
- Any user-impacting logic change requires migration + changelog entry.
- Public releases should be tagged.

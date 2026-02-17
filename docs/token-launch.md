# SKOpi Token Launch Transparency Checklist

Use this when token contract/program is created and deployed.

## Publish these facts publicly
- Mint address
- Treasury address
- Authority/upgrade authority status
- Network/cluster used
- Initial supply parameters
- Lock/burn mechanics references

## Source & Build Proof
- Contract/program source path in repo (`contracts/` or `programs/`)
- Exact commit SHA used for deploy
- Build command and toolchain versions
- Deployment command log (redacted for secrets)

## Verification Instructions
Provide reproducible commands for independent verification:
1. Checkout release tag
2. Build artifact
3. Compare deployed program hash / expected addresses
4. Validate key invariants (supply, authorities, constraints)

## Governance of Changes
Any token-rule changes require:
- New migration/spec doc
- Changelog entry
- New signed release tag

## Post-Launch Attestation Template
- Date/time (UTC):
- Release tag:
- Commit SHA:
- Mint address:
- Treasury address:
- Explorer links:
- Notes:

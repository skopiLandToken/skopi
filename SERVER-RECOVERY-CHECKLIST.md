# SKOpi Server Recovery Checklist

## Pull app
git clone git@github.com:skopiLandToken/skopi.git
cd skopi
npm install

## Env
Create .env.local with production values only.
Do not store secrets, private keys, or service-role keys in GitHub.

## Build / deploy
npm run build
npx vercel --prod

## Important current app status
- Affiliate click tracking is now server-side through middleware
- Old client-side click logger was removed to avoid double counting
- Affiliate dashboard tabs are live:
  - Overview
  - Traffic
  - Conversions
  - Commissions
  - Payouts
- Affiliate payout rates:
  - Level 1 = 8%
  - Level 2 = 3%
  - Level 3 = 1%
- Sale page is updated
- Airdrop page cleaned up
- Token-proof page cleaned up
- Wallet UI exists but wallet testing is intentionally on hold

## Next feature checklist
- Affiliate leaderboard
- Airdrop leaderboard
- Daily bonus
- GitHub-backed server recovery workflow improvements
- Wallet testing later

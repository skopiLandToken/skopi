import { Container, Card, Button } from "./components/ui";

export default async function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <Container>
          <div className="hero-grid">
            <div>
              <div className="eyebrow">Marketing Partner &amp; Airdrop Gateway</div>
              <h1 className="display-xl" style={{ marginTop: 16 }}>
                One keystone. A network that turns capital into land.
              </h1>
              <p className="lede">
                SKOPI is the keystone token of a growing family of self-hosted, utility-driven
                companies. Buy in, track your purchases, claim your airdrop, and — if you’re a
                Marketing Partner — share your link and watch your earnings.
              </p>
              <div className="hero-btns">
                <Button href="/sale" variant="brand">Buy SKOpi</Button>
                <Button href="/airdrop" variant="secondary">Claim Airdrop</Button>
              </div>
              <div className="hero-stats">
                <div className="stat-panel">
                  <span className="stat-panel-label">Supply</span>
                  <span className="stat-panel-value">1,000,000,000 SKOPI</span>
                  <span className="stat-panel-meta">Fixed forever</span>
                </div>
                <div className="stat-panel stat-panel--warm">
                  <span className="stat-panel-label">Locks</span>
                  <span className="stat-panel-value">9 structural</span>
                  <span className="stat-panel-meta">Anti-rug by design</span>
                </div>
              </div>
            </div>
            <div className="keystone-art">
              <svg viewBox="0 0 360 380" xmlns="http://www.w3.org/2000/svg" aria-label="Keystone holding an arch of spinoff stones over deeded land">
                <defs>
                  <linearGradient id="kg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#5eead4" />
                    <stop offset="1" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
                <g fontFamily="ui-monospace,monospace" textAnchor="middle">
                  <path d="M148 18 L212 18 L234 80 L180 116 L126 80 Z" fill="url(#kg)" stroke="#07111f" strokeWidth="1.5" />
                  <text x="180" y="62" fill="#001018" fontSize="14" fontWeight="700">SKOPI</text>
                  <text x="180" y="80" fill="#001018" fontSize="8">keystone</text>
                  <path d="M66 122 L120 92 L150 134 L104 172 Z" fill="#122b4c" stroke="#22d3ee55" strokeWidth="1.5" />
                  <text x="108" y="138" fill="#5eead4" fontSize="11">TERRA</text>
                  <path d="M34 216 L78 170 L116 200 L88 256 Z" fill="#122b4c" stroke="#22d3ee55" strokeWidth="1.5" />
                  <text x="76" y="216" fill="#5eead4" fontSize="9">SVOIcloud</text>
                  <path d="M294 122 L240 92 L210 134 L256 172 Z" fill="#122b4c" stroke="#22d3ee55" strokeWidth="1.5" />
                  <text x="252" y="138" fill="#5eead4" fontSize="11">SVET</text>
                  <path d="M326 216 L282 170 L244 200 L272 256 Z" fill="#122b4c" stroke="#d4af3755" strokeWidth="1.5" opacity=".6" />
                  <text x="284" y="212" fill="#f3d36b" fontSize="8">Svoi Mir</text>
                  <text x="284" y="226" fill="#f3d36b" fontSize="7">reserved</text>
                  <rect x="40" y="296" width="280" height="50" rx="10" fill="#0b1a2f" stroke="#d4af37" strokeWidth="1.5" />
                  <text x="180" y="326" fill="#f3d36b" fontSize="11" letterSpacing="2">DEEDED OREGON LAND</text>
                </g>
              </svg>
            </div>
          </div>
        </Container>
      </section>
      <Container>
      <div style={{ display: "grid", gap: 14 }}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          <Card title="Buy SKOpi" subtitle="Pick a tranche, choose an amount, pay with Phantom.">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button href="/sale">Buy SKOpi</Button>
              <Button href="/me/purchases" variant="secondary">My Purchases</Button>
            </div>
          </Card>

          <Card title="Marketing Partner" subtitle="Get your referral link + view pending/paid earnings.">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button href="/marketing-partners">Marketing Partner Dashboard</Button>
              <Button href="/sale" variant="secondary">Share Sale Link</Button>
            </div>
          </Card>

          <Card title="Account" subtitle="Login / logout to access your dashboards.">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button href="/login" variant="secondary">Login</Button>
              <Button href="/logout" variant="ghost">Logout</Button>
            </div>
          </Card>
        </div>

        <Card title="How it works" subtitle="Short version so users don’t get lost.">
          <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, opacity: 0.9 }}>
            <li>Go to <b>Sale</b>, pick an amount.</li>
            <li>You’ll land on a <b>Receipt</b> with payment steps.</li>
            <li>Click <b>Pay with Phantom</b>, then <b>Verify</b>.</li>
            <li>Track status in <b>My Purchases</b>. Marketing Partners track earnings in <b>Marketing Partner</b>.</li>
          </ol>
        </Card>
      </div>
      </Container>
    </>
  );
}

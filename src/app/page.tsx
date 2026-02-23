
import { Container, Card, Button } from "./components/ui";
import Nav from "./components/Nav";

export default async function Home() {
  return (
    <>
      {/* Nav is already in layout, but keeping pages simple */}
      <Container>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, letterSpacing: -0.3 }}>SKOpi Portal</h1>
            <div style={{ marginTop: 8, opacity: 0.85, maxWidth: 760 }}>
              Buy SKOpi, track your purchases, and (if you’re an affiliate) share your link and see earnings.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
            <Card
              title="Buy SKOpi"
              subtitle="Pick a tranche, choose an amount, pay with Phantom."
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button href="/sale">Open Sale</Button>
                <Button href="/me/purchases" variant="secondary">My Purchases</Button>
              </div>
            </Card>

            <Card
              title="Affiliate"
              subtitle="Get your referral link + view pending/paid earnings."
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button href="/affiliate">Affiliate Dashboard</Button>
                <Button href="/sale" variant="secondary">Share Sale Link</Button>
              </div>
            </Card>

            <Card
              title="Account"
              subtitle="Login / logout to access your dashboard pages."
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button href="/login" variant="secondary">Login</Button>
                <Button href="/logout" variant="ghost">Logout</Button>
              </div>
            </Card>
          </div>

          <Card
            title="How it works"
            subtitle="Short version so users don’t get lost."
          >
            <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, opacity: 0.9 }}>
              <li>Go to <b>Sale</b>, pick an amount.</li>
              <li>You’ll land on a <b>Receipt</b> with payment instructions.</li>
              <li>Click <b>Pay with Phantom</b>, then <b>Verify</b>.</li>
              <li>Track status in <b>My Purchases</b>. Affiliates track earnings in <b>Affiliate</b>.</li>
            </ol>
          </Card>
        </div>
      </Container>
    </>
  );

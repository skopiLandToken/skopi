
import { supabaseServer } from "@/lib/supabase-server";
import { Container, Card, Button, Pill } from "../components/ui";
import CopyButton from "../components/CopyButton";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.skopi.io";

function atomicToUsdc(atomic: bigint) {
  const s = atomic.toString().padStart(7, "0");
  const whole = s.slice(0, -6);
  const frac = s.slice(-6);
  return `${Number(whole).toLocaleString("en-US")}.${frac}`;
}

export default async function AffiliatePage() {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user?.id) {
    return (
      <Container>
        <Card title="Affiliate" subtitle="You must be logged in to view your affiliate dashboard.">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button href="/login">Login</Button>
            <Button href="/sale" variant="secondary">Go to Sale</Button>
          </div>
        </Card>
      </Container>
    );
  }

  const { data: affiliate, error: affErr } = await supabase
    .from("affiliates")
    .select("ref_code,created_at")
    .eq("user_id", user.id)
    .single();

  if (affErr || !affiliate?.ref_code) {
    return (
      <Container>
        <Card title="Affiliate" subtitle="Could not load your affiliate profile.">
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(affErr, null, 2)}</pre>
        </Card>
      </Container>
    );
  }

  const refCode = affiliate.ref_code as string;
  const refLink = `${APP_URL}/sale?ref=${encodeURIComponent(refCode)}`;

  const { data: rows, error: rowsErr } = await supabase
    .from("affiliate_commissions")
    .select("id,created_at,intent_id,level,usdc_atomic,status,paid_at,paid_tx")
    .eq("ref_code", refCode)
    .order("created_at", { ascending: false })
    .limit(50);

  const pending = (rows ?? []).filter((r: any) => r.status === "pending");
  const paid = (rows ?? []).filter((r: any) => r.status === "paid");

  const pendingSum = pending.reduce((s: bigint, r: any) => s + BigInt(r.usdc_atomic ?? 0), 0n);
  const paidSum = paid.reduce((s: bigint, r: any) => s + BigInt(r.usdc_atomic ?? 0), 0n);

  return (
    <Container>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <h1 style={{ margin: 0 }}>Affiliate Dashboard</h1>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Share your link. Earnings update when purchases confirm.
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Pill text={`ref: ${refCode}`} />
            <Button href="/sale" variant="secondary">Open Sale</Button>
            <Button href="/me/purchases" variant="secondary">My Purchases</Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          <Card title="Your referral link" subtitle="Copy + share this.">
            <div style={{ fontFamily: "monospace", wordBreak: "break-all", background: "#f6f6f6", padding: 10, borderRadius: 12 }}>
              {refLink}
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <CopyButton value={refLink} label="Copy link" />
              <Button href={refLink}>Open link</Button>
              <Button href="/sale" variant="ghost">Back to Sale</Button>
            </div>
          </Card>

          <Card title="Pending (USDC)" subtitle={`${pending.length} rows`}>
            <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 800 }}>
              {atomicToUsdc(pendingSum)}
            </div>
          </Card>

          <Card title="Paid (USDC)" subtitle={`${paid.length} rows`}>
            <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 800 }}>
              {atomicToUsdc(paidSum)}
            </div>
          </Card>
        </div>

        <Card title="Recent commissions" subtitle="Latest 50 rows">
          {rowsErr ? (
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(rowsErr, null, 2)}</pre>
          ) : null}

          <div style={{ marginTop: 10, border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "140px 90px 120px 1fr 160px", padding: "10px 12px", background: "#f6f6f6", fontWeight: 800, fontSize: 13 }}>
              <div>Date</div>
              <div>Level</div>
              <div>Status</div>
              <div>Intent</div>
              <div>USDC</div>
            </div>

            {(rows ?? []).map((r: any) => (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "140px 90px 120px 1fr 160px", padding: "10px 12px", borderTop: "1px solid #eee", fontSize: 13, alignItems: "center" }}>
                <div>{new Date(r.created_at).toLocaleDateString()}</div>
                <div>{r.level}</div>
                <div>{r.status}{r.paid_at ? " ✅" : ""}</div>
                <div style={{ fontFamily: "monospace" }}>
                  <a href={`/receipt/${r.intent_id}`} style={{ textDecoration: "none" }}>
                    {String(r.intent_id).slice(0, 8)}…
                  </a>
                </div>
                <div style={{ fontFamily: "monospace" }}>{atomicToUsdc(BigInt(r.usdc_atomic ?? 0))}</div>
              </div>
            ))}

            {(rows ?? []).length === 0 ? (
              <div style={{ padding: 12, opacity: 0.75 }}>No commissions yet.</div>
            ) : null}
          </div>
        </Card>
      </div>
    </Container>
  );
}

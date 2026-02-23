import { createClient } from "@supabase/supabase-js";
import { Container, Card, Button, Pill } from "../../components/ui";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function atomicToUsdc(atomic: bigint) {
  const s = atomic.toString().padStart(7, "0");
  const whole = s.slice(0, -6);
  const frac = s.slice(-6);
  return `${Number(whole).toLocaleString("en-US")}.${frac}`;
}

export default async function AdminCommissionsPage() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: rows, error } = await supabase
    .from("affiliate_commissions")
    .select("id,created_at,intent_id,level,ref_code,usdc_atomic,status,paid_at,paid_tx")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <Container>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin: Commissions</h1>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Latest 100 commission rows.
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button href="/admin/status" variant="secondary">Status</Button>
            <Button href="/admin/intents" variant="secondary">Intents</Button>
            <Button href="/admin/payouts" variant="secondary">Payouts</Button>
          </div>
        </div>

        {error ? (
          <Card title="Error" subtitle="Could not load affiliate_commissions.">
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
          </Card>
        ) : null}

        <Card title="Recent commissions" subtitle="Grouped by row, newest first">
          <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "140px 90px 140px 140px 1fr 140px",
              padding: "10px 12px",
              background: "#f6f6f6",
              fontWeight: 800,
              fontSize: 13
            }}>
              <div>Date</div>
              <div>Level</div>
              <div>Ref</div>
              <div>Status</div>
              <div>Intent</div>
              <div>USDC</div>
            </div>

            {(rows ?? []).map((r: any) => (
              <div key={r.id} style={{
                display: "grid",
                gridTemplateColumns: "140px 90px 140px 140px 1fr 140px",
                padding: "10px 12px",
                borderTop: "1px solid #eee",
                fontSize: 13,
                alignItems: "center"
              }}>
                <div>{new Date(r.created_at).toLocaleDateString()}</div>
                <div><Pill text={`L${r.level}`} /></div>
                <div style={{ fontFamily: "monospace" }}>{r.ref_code}</div>
                <div>{r.status === "paid" ? <Pill text="paid ✅" /> : <Pill text={String(r.status)} />}</div>
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

import { createClient } from "@supabase/supabase-js";
import MarkPaidButton from "./mark-paid-button";
import { Container, Card, Button } from "../../components/ui";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function atomicToUsdc(atomic: bigint) {
  const s = atomic.toString().padStart(7, "0");
  const whole = s.slice(0, -6);
  const frac = s.slice(-6);
  return `${Number(whole).toLocaleString("en-US")}.${frac}`;
}

export default async function AdminPayoutsPage() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: rows, error } = await supabase
    .from("affiliate_commissions")
    .select("id,ref_code,usdc_atomic,status,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <Container>
        <Card title="Admin: Payouts" subtitle="Could not load pending commissions.">
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
        </Card>
      </Container>
    );
  }

  const map = new Map<string, { ref: string; count: number; sum: bigint }>();
  for (const r of rows ?? []) {
    const ref = r.ref_code as string;
    const usdc = BigInt(r.usdc_atomic as any);
    const cur = map.get(ref) || { ref, count: 0, sum: 0n };
    cur.count += 1;
    cur.sum += usdc;
    map.set(ref, cur);
  }

  const batches = Array.from(map.values()).sort((a, b) => Number(b.sum - a.sum));

  return (
    <Container>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin: Payouts</h1>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Groups pending affiliate commissions by ref code.
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button href="/admin/status" variant="secondary">Status</Button>
            <Button href="/admin/intents" variant="secondary">Intents</Button>
            <Button href="/admin/commissions" variant="secondary">Commissions</Button>
          </div>
        </div>

        <Card title="Pending batches" subtitle="Mark Paid flips all pending rows for the ref code to paid.">
          <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "220px 120px 160px 200px",
              padding: "10px 12px",
              background: "#f6f6f6",
              fontWeight: 800,
              fontSize: 13
            }}>
              <div>Ref</div>
              <div>Rows</div>
              <div>Total USDC</div>
              <div>Action</div>
            </div>

            {batches.map((b) => (
              <div key={b.ref} style={{
                display: "grid",
                gridTemplateColumns: "220px 120px 160px 200px",
                padding: "10px 12px",
                borderTop: "1px solid #eee",
                alignItems: "center",
                fontSize: 13
              }}>
                <div style={{ fontFamily: "monospace" }}>{b.ref}</div>
                <div>{b.count}</div>
                <div style={{ fontFamily: "monospace" }}>{atomicToUsdc(b.sum)}</div>
                <div><MarkPaidButton refCode={b.ref} /></div>
              </div>
            ))}

            {batches.length === 0 ? (
              <div style={{ padding: 12, opacity: 0.75 }}>No pending commissions.</div>
            ) : null}
          </div>
        </Card>
      </div>
    </Container>
  );
}

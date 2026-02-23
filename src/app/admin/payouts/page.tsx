import { createClient } from "@supabase/supabase-js";
import MarkPaidButton from "./mark-paid-button";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// USDC atomic -> display
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
      <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
        <h1>Admin: Payouts</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
      </main>
    );
  }

  // Group by ref_code
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
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Admin: Payout Batches</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Groups all <b>pending</b> affiliate_commissions by ref_code.
      </p>

      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 16, overflow: "hidden" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "220px 160px 160px 180px",
          background: "#f6f6f6",
          padding: "10px 12px",
          fontWeight: 700
        }}>
          <div>Ref Code</div>
          <div>Rows</div>
          <div>Total USDC</div>
          <div>Action</div>
        </div>

        {batches.map((b) => (
          <div
            key={b.ref}
            style={{
              display: "grid",
              gridTemplateColumns: "220px 160px 160px 180px",
              padding: "10px 12px",
              borderTop: "1px solid #eee",
              alignItems: "center",
              fontSize: 14,
            }}
          >
            <div style={{ fontFamily: "monospace" }}>{b.ref}</div>
            <div>{b.count}</div>
            <div style={{ fontFamily: "monospace" }}>{atomicToUsdc(b.sum)}</div>
            <div><MarkPaidButton refCode={b.ref} /></div>
          </div>
        ))}

        {batches.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.8 }}>No pending commissions.</div>
        ) : null}
      </div>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
        <b>Next upgrade:</b> replace TEST-PAYOUT with actual tx signature + payout method (USDC/SKOPI), plus export CSV.
      </div>
    </main>
  );
}

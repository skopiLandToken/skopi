import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.skopi.io";

// USDC atomic -> display
function atomicToUsdc(atomic: bigint) {
  const s = atomic.toString().padStart(7, "0");
  const whole = s.slice(0, -6);
  const frac = s.slice(-6);
  return `${Number(whole).toLocaleString("en-US")}.${frac}`;
}

export default async function AffiliatePage() {
  const supabase = supabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    return (
      <main style={{ padding: 24, maxWidth: 780, margin: "0 auto" }}>
        <h1 style={{ margin: 0 }}>Affiliate</h1>
        <p style={{ marginTop: 10 }}>
          You must be logged in to see your affiliate earnings.
        </p>
      </main>
    );
  }

  const { data: affiliate, error: affErr } = await supabase
    .from("affiliates")
    .select("ref_code,created_at")
    .eq("user_id", userId)
    .single();

  if (affErr || !affiliate?.ref_code) {
    return (
      <main style={{ padding: 24, maxWidth: 780, margin: "0 auto" }}>
        <h1 style={{ margin: 0 }}>Affiliate</h1>
        <p style={{ marginTop: 10 }}>Could not load your affiliate profile.</p>
        <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12, borderRadius: 12 }}>
          {JSON.stringify(affErr, null, 2)}
        </pre>
      </main>
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
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Affiliate Dashboard</h1>
      <p style={{ marginTop: 8, opacity: 0.85 }}>
        Share your link. Earnings update when purchases confirm.
      </p>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        <div style={card}>
          <div style={{ fontWeight: 700 }}>Your Ref Code</div>
          <div style={{ fontFamily: "monospace", marginTop: 8 }}>{refCode}</div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 700 }}>Your Referral Link</div>
          <div style={{ fontFamily: "monospace", marginTop: 8, wordBreak: "break-all" }}>{refLink}</div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 700 }}>Pending (USDC)</div>
          <div style={{ fontFamily: "monospace", marginTop: 8, fontSize: 18 }}>{atomicToUsdc(pendingSum)}</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{pending.length} rows</div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 700 }}>Paid (USDC)</div>
          <div style={{ fontFamily: "monospace", marginTop: 8, fontSize: 18 }}>{atomicToUsdc(paidSum)}</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{paid.length} rows</div>
        </div>
      </div>

      <div style={{ marginTop: 18, ...card }}>
        <div style={{ fontWeight: 700 }}>Recent Commissions</div>

        {rowsErr ? (
          <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12, borderRadius: 12, marginTop: 10 }}>
            {JSON.stringify(rowsErr, null, 2)}
          </pre>
        ) : null}

        <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "150px 90px 140px 1fr 160px",
            padding: "10px 12px",
            background: "#f6f6f6",
            fontWeight: 700,
            fontSize: 13
          }}>
            <div>Date</div>
            <div>Level</div>
            <div>Status</div>
            <div>Intent</div>
            <div>USDC</div>
          </div>

          {(rows ?? []).map((r: any) => (
            <div key={r.id} style={{
              display: "grid",
              gridTemplateColumns: "150px 90px 140px 1fr 160px",
              padding: "10px 12px",
              borderTop: "1px solid #eee",
              fontSize: 13,
              alignItems: "center"
            }}>
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
      </div>
    </main>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 14,
  padding: 14,
};

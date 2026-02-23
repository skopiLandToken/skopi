import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.skopi.io";

// IMPORTANT: this assumes purchase_intents stores the referral as `ft_ref_code`
// (that matches what we’ve been passing from /api/purchase-intents).
const REF_FIELD = "ft_ref_code";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default async function AdminAffiliatesPage() {
  const supabase: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: affiliates, error } = await supabase
    .from("affiliates")
    .select("user_id,ref_code,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
        <h1>Admin: Affiliates</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
      </main>
    );
  }

  const rows = await Promise.all(
    (affiliates ?? []).map(async (a: any) => {
      // Count referred intents
      const { count: intentCount } = await (supabase as any)
        .from("purchase_intents")
        .select("id", { count: "exact", head: true })
        .eq(REF_FIELD as any, a.ref_code);

      // Sum tokens referred (best-effort)
      const { data: tokenRows } = await supabase
        .from("purchase_intents")
        .select("tokens_skopi")
        .eq(REF_FIELD as any, a.ref_code);

      const tokensTotal = (tokenRows ?? []).reduce(
        (sum: number, r: any) => sum + Number(r.tokens_skopi ?? 0),
        0
      );

      return {
        ...a,
        intentCount: intentCount ?? 0,
        tokensTotal,
        link: `${APP_URL}/sale?ref=${encodeURIComponent(a.ref_code)}`,
      };
    })
  );

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Admin: Affiliates</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Latest 50 affiliates. Stats are based on purchase_intents.{REF_FIELD}.
      </p>

      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 16, overflow: "hidden" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "220px 190px 140px 170px 1fr",
          background: "#f6f6f6",
          padding: "10px 12px",
          fontWeight: 700
        }}>
          <div>Ref Code</div>
          <div>User</div>
          <div>Referred Buys</div>
          <div>Tokens (sum)</div>
          <div>Referral Link</div>
        </div>

        {rows.map((r) => (
          <div
            key={r.user_id}
            style={{
              display: "grid",
              gridTemplateColumns: "220px 190px 140px 170px 1fr",
              padding: "10px 12px",
              borderTop: "1px solid #eee",
              alignItems: "center",
              fontSize: 14,
            }}
          >
            <div style={{ fontFamily: "monospace" }}>{r.ref_code}</div>
            <div style={{ fontFamily: "monospace", opacity: 0.85 }}>{String(r.user_id).slice(0, 8)}…</div>
            <div>{fmt(Number(r.intentCount || 0))}</div>
            <div>{fmt(Number(r.tokensTotal || 0))}</div>
            <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
              <a href={r.link} style={{ textDecoration: "none" }}>{r.link}</a>
            </div>
          </div>
        ))}

        {rows.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.8 }}>No affiliates found yet.</div>
        ) : null}
      </div>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
        <b>Next upgrade:</b> add commission totals (pending vs paid) from <code>affiliate_commissions</code>.
      </div>
    </main>
  );
}

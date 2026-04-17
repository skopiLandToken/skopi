import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.skopi.io";

const REF_FIELD = "ft_ref_code";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function fmtUsdc(atomic: number) {
  return "$" + (atomic / 1_000_000).toFixed(2);
}

export default async function AdminMarketingPartnersPage() {
  const supabase: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: partners, error } = await supabase
    .from("marketing_partners")
    .select("id,user_id,referral_code,parent_ref_code,auto_enrolled,tax_status,total_paid_usdc,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
        <h1>Admin: Marketing Partners</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
      </main>
    );
  }

  const rows = await Promise.all(
    (partners ?? []).map(async (p: any) => {
      const { count: intentCount } = await supabase
        .from("purchase_intents")
        .select("id", { count: "exact", head: true })
        .eq(REF_FIELD, p.referral_code);

      const { data: tokenRows } = await supabase
        .from("purchase_intents")
        .select("tokens_skopi")
        .eq(REF_FIELD, p.referral_code);

      const tokensTotal = (tokenRows ?? []).reduce(
        (sum: number, r: any) => sum + Number(r.tokens_skopi ?? 0),
        0
      );

      const { data: commRows } = await supabase
        .from("affiliate_commissions")
        .select("usdc_atomic,status")
        .eq("ref_code", p.referral_code);

      const pendingAtomic = (commRows ?? [])
        .filter((r: any) => r.status === "pending")
        .reduce((sum: number, r: any) => sum + Number(r.usdc_atomic ?? 0), 0);

      const payableAtomic = (commRows ?? [])
        .filter((r: any) => r.status === "payable")
        .reduce((sum: number, r: any) => sum + Number(r.usdc_atomic ?? 0), 0);

      const paidAtomic = (commRows ?? [])
        .filter((r: any) => r.status === "paid")
        .reduce((sum: number, r: any) => sum + Number(r.usdc_atomic ?? 0), 0);

      return {
        ...p,
        intentCount: intentCount ?? 0,
        tokensTotal,
        pendingAtomic,
        payableAtomic,
        paidAtomic,
        link: `${APP_URL}/sale?ref=${encodeURIComponent(p.referral_code)}`,
      };
    })
  );

  return (
    <main style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Admin: Marketing Partners</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Latest 50 marketing partners. Commission rates: L1 8% · L2 3% · L3 1%.
      </p>

      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 16, overflow: "hidden" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "180px 130px 110px 130px 110px 110px 110px 1fr",
          background: "#f6f6f6",
          padding: "10px 12px",
          fontWeight: 700,
          fontSize: 13,
        }}>
          <div>Ref Code</div>
          <div>User</div>
          <div>Purchases</div>
          <div>Tokens (sum)</div>
          <div>Pending</div>
          <div>Payable</div>
          <div>Paid</div>
          <div>Referral Link</div>
        </div>

        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              display: "grid",
              gridTemplateColumns: "180px 130px 110px 130px 110px 110px 110px 1fr",
              padding: "10px 12px",
              borderTop: "1px solid #eee",
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <div style={{ fontFamily: "monospace" }}>{r.referral_code}</div>
            <div style={{ fontFamily: "monospace", opacity: 0.85 }}>{String(r.user_id).slice(0, 8)}…</div>
            <div>{fmt(Number(r.intentCount || 0))}</div>
            <div>{fmt(Number(r.tokensTotal || 0))}</div>
            <div style={{ color: "#b45309" }}>{fmtUsdc(r.pendingAtomic)}</div>
            <div style={{ color: "#0369a1" }}>{fmtUsdc(r.payableAtomic)}</div>
            <div style={{ color: "#15803d" }}>{fmtUsdc(r.paidAtomic)}</div>
            <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
              <a href={r.link} style={{ textDecoration: "none" }}>{r.link}</a>
            </div>
          </div>
        ))}

        {rows.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.8 }}>No marketing partners found yet.</div>
        ) : null}
      </div>
    </main>
  );
}

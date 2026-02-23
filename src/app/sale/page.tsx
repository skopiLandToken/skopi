import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default async function SalePage({
  searchParams,
}: {
  searchParams?: { ref?: string };
}) {
  const ref = (searchParams?.ref || "").trim();

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { data: tranches, error } = await supabase
    .from("tranches")
    .select("id,name,price_usdc,tokens_total,tokens_remaining,is_active,sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const qp = ref ? `&ref=${encodeURIComponent(ref)}` : "";

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>SKOpi Sale</h1>
      <p style={{ marginTop: 8, opacity: 0.85 }}>
        Pick a tranche, then choose an amount. You&apos;ll be redirected to a receipt after the intent is created.
      </p>

      <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "1px solid #eee", background: "#fafafa" }}>
        <b>Referral:</b> {ref ? <span style={{ fontFamily: "monospace" }}>{ref}</span> : <span style={{ opacity: 0.7 }}>none</span>}
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
          Share link: <span style={{ fontFamily: "monospace" }}>https://app.skopi.io/sale?ref={ref || "YOURCODE"}</span>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #f00", borderRadius: 12 }}>
          <b>Could not load tranches</b>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 16 }}>
        {(tranches ?? []).map((t) => {
          const remaining = Number(t.tokens_remaining ?? 0);
          const total = Number(t.tokens_total ?? 0);
          const sold = Math.max(0, total - remaining);

          return (
            <div key={t.id} style={{ border: "1px solid #ddd", borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{t.name}</div>
              <div style={{ marginTop: 6 }}><b>Price:</b> ${t.price_usdc} USDC / SKOPI</div>
              <div style={{ marginTop: 6 }}><b>Remaining:</b> {fmt(remaining)} / {fmt(total)}</div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}><b>Sold:</b> {fmt(sold)}</div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <a href={`/buy?amount=10${qp}`} style={btnStyle}>Buy $10</a>
                <a href={`/buy?amount=25${qp}`} style={btnStyle}>Buy $25</a>
                <a href={`/buy?amount=100${qp}`} style={btnStyle}>Buy $100</a>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
                Ref automatically carried into checkout.
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

const btnStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #111",
  textDecoration: "none",
  color: "#111",
};

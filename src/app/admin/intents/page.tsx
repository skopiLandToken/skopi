import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default async function AdminIntentsPage() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: intents, error } = await supabase
    .from("purchase_intents")
    .select("id,status,tranche_id,price_usdc_used,tokens_skopi,reference_pubkey,created_at,confirmed_at,tx_signature,failure_reason")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Admin: Purchase Intents</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Latest 50 intents. Click an ID to open the receipt page.
      </p>

      {error ? (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #f00", borderRadius: 12 }}>
          <b>Could not load purchase intents</b>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
        </div>
      ) : null}

      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "240px 110px 120px 120px 220px 1fr", gap: 0, background: "#f6f6f6", padding: "10px 12px", fontWeight: 700 }}>
          <div>Intent</div>
          <div>Status</div>
          <div>Price</div>
          <div>Tokens</div>
          <div>Created</div>
          <div>Reference</div>
        </div>

        {(intents ?? []).map((i) => (
          <div
            key={i.id}
            style={{
              display: "grid",
              gridTemplateColumns: "240px 110px 120px 120px 220px 1fr",
              padding: "10px 12px",
              borderTop: "1px solid #eee",
              alignItems: "center",
              fontSize: 14,
            }}
          >
            <div style={{ fontFamily: "monospace" }}>
              <a href={`/receipt/${i.id}`} style={{ textDecoration: "none" }}>
                {i.id.slice(0, 8)}…
              </a>
            </div>
            <div>{i.status}</div>
            <div>{i.price_usdc_used} USDC</div>
            <div>{fmt(Number(i.tokens_skopi ?? 0))}</div>
            <div>{new Date(i.created_at).toLocaleString()}</div>
            <div style={{ fontFamily: "monospace", wordBreak: "break-all", opacity: 0.85 }}>
              {i.reference_pubkey}
            </div>
          </div>
        ))}

        {(!intents || intents.length === 0) ? (
          <div style={{ padding: 12, opacity: 0.8 }}>No intents found yet.</div>
        ) : null}
      </div>
    </main>
  );
}

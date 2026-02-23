import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function badge(status: string) {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    border: "1px solid #ddd",
  };

  if (status === "confirmed") return { ...base, border: "1px solid #0a0" };
  if (status === "awaiting_payment") return { ...base, border: "1px solid #888" };
  if (status === "failed") return { ...base, border: "1px solid #f00" };
  return base;
}

export default async function MyPurchasesPage() {
  const supabase = supabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user?.id) {
    return (
      <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ margin: 0 }}>My Purchases</h1>
        <p style={{ marginTop: 10 }}>
          You must be logged in. Go to <a href="/login">/login</a>.
        </p>
      </main>
    );
  }

  const { data: intents, error } = await supabase
    .from("purchase_intents")
    .select("id,status,price_usdc_used,tokens_skopi,reference_pubkey,created_at,confirmed_at,tx_signature,failure_reason")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>My Purchases</h1>
      <p style={{ marginTop: 8, opacity: 0.85 }}>
        Latest 50 purchase intents. Click any row to open its receipt.
      </p>

      {error ? (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: "1px solid #f00" }}>
          <b>Could not load purchases</b>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
        </div>
      ) : null}

      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 16, overflow: "hidden" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "260px 140px 140px 220px 1fr",
          background: "#f6f6f6",
          padding: "10px 12px",
          fontWeight: 700
        }}>
          <div>Receipt</div>
          <div>Status</div>
          <div>Tokens</div>
          <div>Created</div>
          <div>Tx</div>
        </div>

        {(intents ?? []).map((i: any) => (
          <a
            key={i.id}
            href={`/receipt/${i.id}`}
            style={{
              display: "grid",
              gridTemplateColumns: "260px 140px 140px 220px 1fr",
              padding: "10px 12px",
              borderTop: "1px solid #eee",
              alignItems: "center",
              fontSize: 14,
              textDecoration: "none",
              color: "#111",
            }}
          >
            <div style={{ fontFamily: "monospace" }}>{i.id.slice(0, 8)}…</div>
            <div><span style={badge(i.status)}>{i.status}</span></div>
            <div>{Number(i.tokens_skopi ?? 0).toLocaleString("en-US")}</div>
            <div>{new Date(i.created_at).toLocaleString()}</div>
            <div style={{ fontFamily: "monospace", wordBreak: "break-all", opacity: 0.8 }}>
              {i.tx_signature || "—"}
            </div>
          </a>
        ))}

        {(intents ?? []).length === 0 ? (
          <div style={{ padding: 12, opacity: 0.75 }}>No purchases yet.</div>
        ) : null}
      </div>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
        <b>Next:</b> email notifications on confirm + better export.
      </div>
    </main>
  );
}

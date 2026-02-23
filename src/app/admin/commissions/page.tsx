import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function AdminCommissionsPage() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: rows, error } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Admin: Affiliate Commissions</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Latest 100 commission rows (raw). This is the foundation for payout batching.
      </p>

      {error ? (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: "1px solid #f00" }}>
          <b>Could not load affiliate_commissions</b>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
        </div>
      ) : null}

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Rows: {rows?.length ?? 0}</div>
        <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12, borderRadius: 12, maxHeight: 520, overflow: "auto" }}>
          {JSON.stringify(rows ?? [], null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
        <b>Next upgrade:</b> aggregate totals per affiliate (pending vs paid) + add “Mark paid” actions.
      </div>
    </main>
  );
}

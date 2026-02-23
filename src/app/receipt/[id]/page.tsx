import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: intent, error } = await supabase
    .from("purchase_intents")
    .select(
      "id,status,tranche_id,price_usdc_used,tokens_skopi,reference_pubkey,created_at,confirmed_at,tx_signature,failure_reason,updated_at"
    )
    .eq("id", params.id)
    .single();

  if (error || !intent) {
    return (
      <main style={{ padding: 24, maxWidth: 760 }}>
        <h1 style={{ marginBottom: 8 }}>Receipt</h1>
        <p>Could not load this purchase intent.</p>
        <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
          {JSON.stringify(error, null, 2)}
        </pre>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 760 }}>
      <h1 style={{ marginBottom: 8 }}>Receipt</h1>

      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <div><b>Intent ID:</b> {intent.id}</div>
        <div><b>Status:</b> {intent.status}</div>
        <div><b>Tranche:</b> {intent.tranche_id}</div>
        <div><b>Price used:</b> {intent.price_usdc_used} USDC</div>
        <div><b>Tokens:</b> {intent.tokens_skopi} SKOPI</div>
        <div style={{ marginTop: 10 }}><b>Reference pubkey:</b></div>
        <div style={{ fontFamily: "monospace", wordBreak: "break-all", background: "#f6f6f6", padding: 10, borderRadius: 8 }}>
          {intent.reference_pubkey}
        </div>

        <div style={{ marginTop: 10, fontSize: 14, opacity: 0.9 }}>
          <div><b>Created:</b> {intent.created_at}</div>
          {intent.updated_at ? <div><b>Updated:</b> {intent.updated_at}</div> : null}
          {intent.confirmed_at ? <div><b>Confirmed:</b> {intent.confirmed_at}</div> : null}
          {intent.tx_signature ? <div><b>Tx signature:</b> {intent.tx_signature}</div> : null}
          {intent.failure_reason ? <div><b>Failure reason:</b> {intent.failure_reason}</div> : null}
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
        <b>Next step:</b> Send the USDC payment using the <b>reference pubkey</b> above.
        <div style={{ marginTop: 8 }}>
          Then refresh this page after payment, or use your existing verify/confirm flow.
        </div>
      </div>
    </main>
  );
}

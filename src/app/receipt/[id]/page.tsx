import { createClient } from "@supabase/supabase-js";
import VerifyButton from "../components/verify-button";
import VerifyRealButton from "../components/verify-real-button";
import PayPhantomButton from "../components/pay-phantom-button";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TREASURY = process.env.NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS || "";
const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || "";

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: intent, error } = await supabase
    .from("purchase_intents")
    .select("id,status,tranche_id,price_usdc_used,tokens_skopi,amount_usdc_atomic,reference_pubkey,created_at,confirmed_at,tx_signature,failure_reason,updated_at")
    .eq("id", params.id)
    .single();

  if (error || !intent) {
    return (
      <main style={{ padding: 24, maxWidth: 760 }}>
        <h1>Receipt</h1>
        <p>Could not load this purchase intent.</p>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 920 }}>
      <h1 style={{ marginBottom: 8 }}>Receipt</h1>

      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <div><b>Status:</b> {intent.status}</div>
        <div><b>Tranche:</b> {intent.tranche_id}</div>
        <div><b>Price used:</b> {intent.price_usdc_used} USDC</div>
        <div><b>Tokens:</b> {intent.tokens_skopi} SKOPI</div>

        <div style={{ marginTop: 10 }}><b>Reference pubkey:</b></div>
        <div style={{ fontFamily: "monospace", wordBreak: "break-all", background: "#f6f6f6", padding: 10, borderRadius: 8 }}>
          {intent.reference_pubkey}
        </div>

        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
          <div><b>Created:</b> {intent.created_at}</div>
          {intent.updated_at ? <div><b>Updated:</b> {intent.updated_at}</div> : null}
          {intent.confirmed_at ? <div><b>Confirmed:</b> {intent.confirmed_at}</div> : null}
          {intent.tx_signature ? <div><b>Tx signature:</b> {intent.tx_signature}</div> : null}
          {intent.failure_reason ? <div><b>Failure reason:</b> {intent.failure_reason}</div> : null}
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
        <b>Payment instructions:</b>
        <div style={{ marginTop: 8 }}>
          Send <b>USDC</b> to the treasury and include the <b>reference pubkey</b>.
        </div>

        <div style={{ marginTop: 10 }}>
          <div><b>Treasury:</b></div>
          <div style={{ fontFamily: "monospace", wordBreak: "break-all", background: "#f6f6f6", padding: 10, borderRadius: 8 }}>
            {TREASURY || "MISSING: set NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS"}
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div><b>USDC Mint:</b></div>
          <div style={{ fontFamily: "monospace", wordBreak: "break-all", background: "#f6f6f6", padding: 10, borderRadius: 8 }}>
            {USDC_MINT || "MISSING: set NEXT_PUBLIC_USDC_MINT"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <div style={{ padding: 14, borderRadius: 12, border: "1px solid #ddd" }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Pay with wallet</div>
          <PayPhantomButton
            intentId={intent.id}
            amountUsdcAtomic={String(intent.amount_usdc_atomic)}
            referencePubkey={String(intent.reference_pubkey)}
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <VerifyButton intentId={intent.id} />
          <VerifyRealButton intentId={intent.id} />
        </div>
      </div>
    </main>
  );
}

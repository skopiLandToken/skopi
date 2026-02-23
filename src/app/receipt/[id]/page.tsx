import { createClient } from "@supabase/supabase-js";
import { Container, Card, Button, Pill } from "../../components/ui";
import PayPhantomButton from "../components/pay-phantom-button";
import VerifyRealButton from "../components/verify-real-button";
import VerifyButton from "../components/verify-button";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TREASURY = process.env.NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS || "";
const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || "";

function isAdminEmail(email: string | null | undefined) {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!email) return false;
  if (allow.length === 0) return false;
  return allow.includes(email.toLowerCase());
}

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  // Load intent (service role is fine for rendering receipt details)
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
      <Container>
        <Card title="Receipt" subtitle="Could not load purchase intent.">
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
          <div style={{ marginTop: 12 }}>
            <Button href="/sale">Back to Sale</Button>
          </div>
        </Card>
      </Container>
    );
  }

  // Determine admin (for showing test tools)
  const ssr = supabaseServer();
  const { data: userData } = await ssr.auth.getUser();
  const email = userData?.user?.email || null;
  const isAdmin = isAdminEmail(email);

  const status = String(intent.status || "");

  const stepPill = (n: number, text: string) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Pill text={`Step ${n}`} />
      <span style={{ fontWeight: 800 }}>{text}</span>
    </span>
  );

  const isConfirmed = status === "confirmed";

  return (
    <Container>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <h1 style={{ margin: 0 }}>Receipt</h1>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Follow the steps below. Keep this page open until you see “Confirmed”.
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Pill text={`status: ${status}`} />
            {intent.tx_signature ? <Pill text="tx: saved" /> : null}
          </div>
        </div>

        <Card
          title="Summary"
          subtitle="Your purchase details"
          right={<Pill text={`${intent.tokens_skopi} SKOPI`} />}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <div><b>Price used:</b> {intent.price_usdc_used} USDC</div>
            <div><b>Tranche:</b> {intent.tranche_id}</div>
            <div><b>Created:</b> {new Date(intent.created_at).toLocaleString()}</div>
            <div><b>Confirmed:</b> {intent.confirmed_at ? new Date(intent.confirmed_at).toLocaleString() : "—"}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Reference pubkey</div>
            <div style={{ fontFamily: "monospace", wordBreak: "break-all", background: "#f6f6f6", padding: 10, borderRadius: 12 }}>
              {intent.reference_pubkey}
            </div>
          </div>

          {intent.tx_signature ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Transaction</div>
              <div style={{ fontFamily: "monospace", wordBreak: "break-all", background: "#f6f6f6", padding: 10, borderRadius: 12 }}>
                {intent.tx_signature}
              </div>
            </div>
          ) : null}

          {intent.failure_reason ? (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 12, border: "1px solid #f00" }}>
              <b>Failure:</b> {intent.failure_reason}
            </div>
          ) : null}
        </Card>

        <Card
          title={undefined}
          subtitle={undefined}
          right={stepPill(1, "Pay with Phantom")}
        >
          <div style={{ opacity: 0.85 }}>
            This will send USDC to the treasury and attach your reference key so the verifier can find it.
          </div>

          <div style={{ marginTop: 12 }}>
            <PayPhantomButton
              intentId={intent.id}
              amountUsdcAtomic={String(intent.amount_usdc_atomic)}
              referencePubkey={String(intent.reference_pubkey)}
            />
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8, fontSize: 13, opacity: 0.85 }}>
            <div><b>Treasury:</b> <span style={{ fontFamily: "monospace" }}>{TREASURY || "MISSING ENV"}</span></div>
            <div><b>USDC Mint:</b> <span style={{ fontFamily: "monospace" }}>{USDC_MINT || "MISSING ENV"}</span></div>
          </div>
        </Card>

        <Card
          title={undefined}
          subtitle={undefined}
          right={stepPill(2, "Verify on-chain")}
        >
          <div style={{ opacity: 0.85 }}>
            After sending, verify will scan recent treasury transactions and look for your reference key.
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <VerifyRealButton intentId={intent.id} />
            {isAdmin ? (
              <div title="Admin-only test confirm (no chain)">
                <VerifyButton intentId={intent.id} />
              </div>
            ) : null}
          </div>
        </Card>

        <Card
          title={undefined}
          subtitle={undefined}
          right={stepPill(3, "Done")}
        >
          {isConfirmed ? (
            <>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Confirmed ✅</div>
              <div style={{ marginTop: 8, opacity: 0.85 }}>
                You can now track everything in My Purchases. If you used a referral code, commissions will appear for affiliates.
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button href="/me/purchases">My Purchases</Button>
                <Button href="/affiliate" variant="secondary">Affiliate</Button>
                <Button href="/sale" variant="secondary">Buy More</Button>
              </div>
            </>
          ) : (
            <>
              <div style={{ opacity: 0.9 }}>
                Not confirmed yet. Complete Step 1 (pay) then Step 2 (verify).
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button href="/me/purchases" variant="secondary">My Purchases</Button>
                <Button href="/sale" variant="secondary">Back to Sale</Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </Container>
  );
}

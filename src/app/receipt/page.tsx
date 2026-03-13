import { createClient } from "@supabase/supabase-js";
import { Container, Card, Button, Pill } from "../components/ui";
import PayPhantomButton from "./components/pay-phantom-button";
import VerifyRealButton from "./components/verify-real-button";
import VerifyButton from "./components/verify-button";
import ClaimSkopiButton from "./components/claim-skopi-button";
import CopyButton from "../components/CopyButton";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TREASURY = process.env.NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS || "";
const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || "";

const BOX = {
  bg: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  text: "rgba(255,255,255,0.92)",
  subtext: "rgba(255,255,255,0.78)",
};

function isAdminEmail(email: string | null | undefined) {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!email) return false;
  if (allow.length === 0) return false;
  return allow.includes(email.toLowerCase());
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default async function ReceiptPage(props: { searchParams?: any }) {
  const sp = await Promise.resolve(props?.searchParams ?? {});
  const raw = sp?.id;
  const id = String(Array.isArray(raw) ? raw[0] : raw || "").trim();

  if (!id || id === "undefined" || !isUuid(id)) {
    return (
      <Container>
        <Card title="Receipt" subtitle="Could not load purchase intent.">
          <pre style={{ whiteSpace: "pre-wrap", color: BOX.text }}>
            {JSON.stringify(
              { message: "Missing or invalid receipt id. Use /receipt?id=<uuid>.", received: id || null },
              null,
              2
            )}
          </pre>
          <div style={{ marginTop: 12 }}>
            <Button href="/sale">Back to Sale</Button>
          </div>
        </Card>
      </Container>
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: intent, error } = await supabase
    .from("purchase_intents")
    .select("id,status,tranche_id,price_usdc_used,tokens_skopi,amount_usdc_atomic,reference_pubkey,created_at,confirmed_at,tx_signature,failure_reason,updated_at,payer_pubkey,skopi_claimed_at,skopi_tx_signature")
    .eq("id", id)
    .single();

  if (error || !intent) {
    return (
      <Container>
        <Card title="Receipt" subtitle="Could not load purchase intent.">
          <pre style={{ whiteSpace: "pre-wrap", color: BOX.text }}>{JSON.stringify(error, null, 2)}</pre>
          <div style={{ marginTop: 12 }}>
            <Button href="/sale">Back to Sale</Button>
          </div>
        </Card>
      </Container>
    );
  }

  const ssr = await supabaseServer();
  const { data: userData } = await ssr.auth.getUser();
  const email = userData?.user?.email || null;
  const isAdmin = isAdminEmail(email);

  const status = String(intent.status || "");
  const isConfirmed = status === "confirmed";

  const stepHeader = (n: number, text: string) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Pill text={`Step ${n}`} />
      <span style={{ fontWeight: 800 }}>{text}</span>
    </span>
  );

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

        {isConfirmed ? (
          <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(0,255,140,0.35)", background: "rgba(0,255,140,0.08)", color: BOX.text }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Confirmed ✅</div>
            <div style={{ marginTop: 6, color: BOX.subtext }}>
              Payment verified. You can view it anytime in <a href="/me/purchases">My Purchases</a>.
            </div>
          </div>
        ) : (
          <div style={{ padding: 14, borderRadius: 16, border: BOX.border, background: BOX.bg, color: BOX.text }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Waiting for confirmation</div>
            <div style={{ marginTop: 6, color: BOX.subtext }}>
              After you pay, click Verify. If it doesn’t confirm instantly, wait ~10 seconds and try again.
            </div>
          </div>
        )}

        <Card title="Summary" subtitle="Your purchase details" right={<Pill text={`${intent.tokens_skopi} SKOPI`} />}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <div><b>Price used:</b> {intent.price_usdc_used} USDC</div>
            <div><b>Tranche:</b> {intent.tranche_id}</div>
            <div><b>Created:</b> {new Date(intent.created_at).toLocaleString()}</div>
            <div><b>Confirmed:</b> {intent.confirmed_at ? new Date(intent.confirmed_at).toLocaleString() : "—"}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Reference pubkey</div>
            <div
              style={{
                fontFamily: "monospace",
                wordBreak: "break-all",
                background: BOX.bg,
                color: BOX.text,
                border: BOX.border,
                padding: 10,
                borderRadius: 12,
              }}
            >
              {intent.reference_pubkey}
            </div>
            <div style={{ marginTop: 10 }}>
              <CopyButton value={String(intent.reference_pubkey)} label="Copy reference" />
            </div>
          </div>

          {intent.tx_signature ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Transaction</div>
              <div
                style={{
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                  background: BOX.bg,
                  color: BOX.text,
                  border: BOX.border,
                  padding: 10,
                  borderRadius: 12,
                }}
              >
                {intent.tx_signature}
              </div>
            </div>
          ) : null}

          {intent.failure_reason ? (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 12, border: "1px solid rgba(255,80,80,0.6)", background: "rgba(255,80,80,0.08)", color: BOX.text }}>
              <b>Failure:</b> {intent.failure_reason}
            </div>
          ) : null}
        </Card>

        <Card title={undefined} subtitle={undefined} right={stepHeader(1, "Pay with Phantom")}>
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

          <div style={{ marginTop: 12, display: "grid", gap: 8, fontSize: 13, opacity: 0.9 }}>
            <div><b>Treasury:</b> <span style={{ fontFamily: "monospace" }}>{TREASURY || "MISSING ENV"}</span></div>
            <CopyButton value={TREASURY} label="Copy treasury" />
            <div><b>USDC Mint:</b> <span style={{ fontFamily: "monospace" }}>{USDC_MINT || "MISSING ENV"}</span></div>
            <CopyButton value={USDC_MINT} label="Copy USDC mint" />
          </div>
        </Card>

        <Card title={undefined} subtitle={undefined} right={stepHeader(2, "Verify on-chain")}>
          <div style={{ opacity: 0.85 }}>
            Verify will scan recent treasury transactions and look for your reference key.
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

        <Card title={undefined} subtitle={undefined} right={stepHeader(3, "Claim SKOPI")}>
          {!isConfirmed ? (
            <div style={{ opacity: 0.85 }}>
              Claim is available after your payment is confirmed.
            </div>
          ) : intent.skopi_claimed_at ? (
            <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(0,255,140,0.35)", background: "rgba(0,255,140,0.08)" }}>
              <div style={{ fontWeight: 900 }}>Claimed ✅</div>
              <div style={{ marginTop: 6, opacity: 0.85 }}>
                SKOPI has been sent to your wallet.
              </div>
              {intent.skopi_tx_signature ? (
                <div style={{ marginTop: 10, fontFamily: "monospace", wordBreak: "break-all", opacity: 0.85 }}>
                  skopi tx: {String(intent.skopi_tx_signature)}
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ opacity: 0.85 }}>
                Click Claim to receive your SKOPI tokens in your connected wallet.
              </div>
              <ClaimSkopiButton intentId={intent.id} />
            </div>
          )}
        </Card>

      </div>
    </Container>
  );
}

import { createClient } from "@supabase/supabase-js";
import ForceConfirmButton from "./force-confirm";
import { Container, Card, Pill, Button } from "../../components/ui";

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
    <Container>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin: Intents</h1>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Latest 50 intents. Use Force Confirm for test-mode only.
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button href="/admin/status" variant="secondary">Status</Button>
            <Button href="/admin/commissions" variant="secondary">Commissions</Button>
            <Button href="/admin/payouts" variant="secondary">Payouts</Button>
          </div>
        </div>

        <Card
          title="Setup required"
          subtitle="For Force Confirm to work"
        >
          <div style={{ display: "grid", gap: 6, fontSize: 13, opacity: 0.9 }}>
            <div>Set <b>NEXT_PUBLIC_ADMIN_FORCE_CONFIRM_TOKEN</b> in Vercel (must match <b>ADMIN_FORCE_CONFIRM_TOKEN</b>).</div>
          </div>
        </Card>

        {error ? (
          <Card title="Error" subtitle="Could not load purchase intents.">
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
          </Card>
        ) : null}

        <Card title="Recent intents" subtitle="Click receipt id to open receipt page">
          <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "230px 130px 140px 1fr 180px",
              padding: "10px 12px",
              background: "#f6f6f6",
              fontWeight: 800,
              fontSize: 13
            }}>
              <div>Receipt</div>
              <div>Status</div>
              <div>Tokens</div>
              <div>Reference</div>
              <div>Action</div>
            </div>

            {(intents ?? []).map((i: any) => (
              <div key={i.id} style={{
                display: "grid",
                gridTemplateColumns: "230px 130px 140px 1fr 180px",
                padding: "10px 12px",
                borderTop: "1px solid #eee",
                alignItems: "center",
                fontSize: 13
              }}>
                <div style={{ fontFamily: "monospace" }}>
                  <a href={`/receipt/${i.id}`} style={{ textDecoration: "none" }}>
                    {String(i.id).slice(0, 8)}…
                  </a>
                </div>
                <div>{i.status === "confirmed" ? <Pill text="confirmed ✅" /> : <Pill text={String(i.status)} />}</div>
                <div>{fmt(Number(i.tokens_skopi ?? 0))}</div>
                <div style={{ fontFamily: "monospace", wordBreak: "break-all", opacity: 0.8 }}>
                  {i.reference_pubkey}
                </div>
                <div>
                  {i.status === "confirmed" ? (
                    <span style={{ fontSize: 12, opacity: 0.7 }}>Confirmed</span>
                  ) : (
                    <ForceConfirmButton intentId={i.id} />
                  )}
                </div>
              </div>
            ))}

            {(intents ?? []).length === 0 ? (
              <div style={{ padding: 12, opacity: 0.75 }}>No intents yet.</div>
            ) : null}
          </div>
        </Card>
      </div>
    </Container>
  );
}

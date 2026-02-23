import { supabaseServer } from "@/lib/supabase-browser";
import { Container, Card, Button, Pill } from "../../components/ui";

export const dynamic = "force-dynamic";

function statusPill(status: string) {
  if (status === "confirmed") return <Pill text="confirmed ✅" />;
  if (status === "awaiting_payment") return <Pill text="awaiting payment" />;
  if (status === "created") return <Pill text="created" />;
  if (status === "failed") return <Pill text="failed" />;
  return <Pill text={status || "unknown"} />;
}

export default async function MyPurchasesPage() {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user?.id) {
    return (
      <Container>
        <Card title="My Purchases" subtitle="You must be logged in to see your purchases.">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button href="/login">Login</Button>
            <Button href="/sale" variant="secondary">Go to Sale</Button>
          </div>
        </Card>
      </Container>
    );
  }

  const { data: intents, error } = await supabase
    .from("purchase_intents")
    .select("id,status,price_usdc_used,tokens_skopi,created_at,confirmed_at,tx_signature,failure_reason")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <Container>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <h1 style={{ margin: 0 }}>My Purchases</h1>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Your latest purchase intents. Click “Open Receipt” to continue payment or verify.
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button href="/sale">Buy More</Button>
            <Button href="/affiliate" variant="secondary">Affiliate</Button>
          </div>
        </div>

        {error ? (
          <Card title="Error" subtitle="Could not load purchases.">
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
          </Card>
        ) : null}

        <div style={{ display: "grid", gap: 12 }}>
          {(intents ?? []).map((i: any) => (
            <Card
              key={i.id}
              title={`Receipt ${String(i.id).slice(0, 8)}…`}
              subtitle={new Date(i.created_at).toLocaleString()}
              right={statusPill(String(i.status))}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, fontSize: 14 }}>
                <div><b>Tokens:</b> {Number(i.tokens_skopi ?? 0).toLocaleString("en-US")} SKOPI</div>
                <div><b>Price used:</b> {i.price_usdc_used} USDC</div>
                <div><b>Confirmed:</b> {i.confirmed_at ? new Date(i.confirmed_at).toLocaleString() : "—"}</div>
                <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}><b>Tx:</b> {i.tx_signature || "—"}</div>
              </div>

              {i.failure_reason ? (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 12, border: "1px solid #f00" }}>
                  <b>Failure:</b> {i.failure_reason}
                </div>
              ) : null}

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button href={`/receipt/${i.id}`}>Open Receipt</Button>
                {String(i.status) !== "confirmed" ? (
                  <Button href={`/receipt/${i.id}`} variant="secondary">Resume</Button>
                ) : (
                  <Button href="/affiliate" variant="secondary">View Affiliate</Button>
                )}
              </div>
            </Card>
          ))}

          {(intents ?? []).length === 0 ? (
            <Card title="No purchases yet" subtitle="When you buy SKOpi, your receipts will show up here.">
              <Button href="/sale">Go to Sale</Button>
            </Card>
          ) : null}
        </div>
      </div>
    </Container>
  );
}

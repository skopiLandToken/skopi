
import { createClient } from "@supabase/supabase-js";
import { Container, Card, Button, Pill } from "../components/ui";

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
    <Container>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <h1 style={{ margin: 0 }}>Sale</h1>
          <div style={{ marginTop: 8, opacity: 0.85, maxWidth: 840 }}>
            Pick a tranche, then choose an amount. You’ll be redirected to a receipt after the intent is created.
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Pill text={ref ? `ref: ${ref}` : "no ref"} />
            <span style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.75 }}>
              Share: https://app.skopi.io/sale?ref={ref || "YOURCODE"}
            </span>
          </div>
        </div>

        {error ? (
          <Card title="Error" subtitle="Could not load tranches.">
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(error, null, 2)}</pre>
          </Card>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {(tranches ?? []).map((t: any) => {
            const remaining = Number(t.tokens_remaining ?? 0);
            const total = Number(t.tokens_total ?? 0);
            const sold = Math.max(0, total - remaining);
            const pct = total > 0 ? Math.round((sold / total) * 100) : 0;

            return (
              <Card
                key={t.id}
                title={t.name}
                subtitle={`$${t.price_usdc} USDC / SKOPI • ${fmt(remaining)} remaining`}
                right={<Pill text={`${pct}% sold`} />}
              >
                <div style={{ marginBottom: 10, height: 10, borderRadius: 999, background: "#f0f0f0", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "#111" }} />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button href={`/buy?amount=10${qp}`}>Buy $10</Button>
                  <Button href={`/buy?amount=25${qp}`} variant="secondary">Buy $25</Button>
                  <Button href={`/buy?amount=100${qp}`} variant="secondary">Buy $100</Button>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                  Ref is automatically carried into checkout.
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Container>
  );
}

import { Container } from "../components/ui";
import WalletStatusBadge from "../components/wallet-status-badge";
import SaleClient from "./sale-client";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function SalePage({
  searchParams,
}: {
  searchParams?: { ref?: string };
}) {
  const ref = (searchParams?.ref || "").trim();

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { count } = await supabase
    .from("purchase_intents")
    .select("id", { count: "exact", head: true })
    .eq("status", "confirmed");

  const nextBuyerPosition = Number(count || 0) + 1;

  return (
    <Container>
      <div style={{ marginBottom: 14 }}>
        <WalletStatusBadge compact />
      </div>

      <SaleClient refCode={ref} nextBuyerPosition={nextBuyerPosition} />
    </Container>
  );
}

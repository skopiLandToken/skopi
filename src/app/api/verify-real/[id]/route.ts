import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TREASURY = process.env.NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS || "";
const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || "";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: intent, error } = await supabase
    .from("purchase_intents")
    .select("id,status,amount_usdc_atomic,reference_pubkey,created_at,confirmed_at,tx_signature")
    .eq("id", params.id)
    .single();

  if (error || !intent) {
    return NextResponse.json({ ok: false, error: "Intent not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    implemented: false,
    message:
      "Real on-chain verification not enabled yet. This endpoint returns the exact intent data needed to verify a USDC transfer with reference.",
    intent,
    treasury: TREASURY,
    usdc_mint: USDC_MINT,
    todo: [
      "Use Solana RPC to find USDC token transfers to treasury that include reference_pubkey",
      "Match amount_usdc_atomic and confirm within time window",
      "Write tx_signature, confirmed_at, status=confirmed",
      "Call commit_affiliate_commissions(intent_id)",
    ],
  });
}

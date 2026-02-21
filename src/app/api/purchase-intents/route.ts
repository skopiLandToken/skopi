import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Be tolerant: accept either amount_usdc_atomic or amount (atomic)
    const amount_usdc_atomic =
      Number(body.amount_usdc_atomic ?? body.amount ?? 0);

    const treasury_address =
      String(body.treasury_address ?? process.env.SKOPI_TREASURY_ADDRESS ?? "");

    const usdc_mint =
      String(body.usdc_mint ?? process.env.USDC_MINT ?? "");

    const reference_pubkey = String(body.reference_pubkey ?? "");
    const ft_ref_code = body.ft_ref_code ? String(body.ft_ref_code) : null;

    if (!amount_usdc_atomic || amount_usdc_atomic <= 0) {
      return NextResponse.json({ ok: false, error: "amount_usdc_atomic required" }, { status: 400 });
    }
    if (!treasury_address) {
      return NextResponse.json({ ok: false, error: "treasury_address required" }, { status: 400 });
    }
    if (!usdc_mint) {
      return NextResponse.json({ ok: false, error: "usdc_mint required" }, { status: 400 });
    }
    if (!reference_pubkey) {
      return NextResponse.json({ ok: false, error: "reference_pubkey required" }, { status: 400 });
    }

    // Create intent via DB RPC (bind tranche + snapshot price + compute tokens_skopi)
    const { data, error } = await supabase.rpc("create_purchase_intent_with_tranche", {
      p_amount_usdc_atomic: amount_usdc_atomic,
      p_treasury_address: treasury_address,
      p_usdc_mint: usdc_mint,
      p_reference_pubkey: reference_pubkey,
      p_ft_ref_code: ft_ref_code,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Supabase RPC can return array rows; normalize
    const row = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({ ok: true, intent: row });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected server error" }, { status: 500 });
  }
}

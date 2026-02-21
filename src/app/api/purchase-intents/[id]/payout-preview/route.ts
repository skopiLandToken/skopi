import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const RATE_L1 = 0.20;
const RATE_L2 = 0.10;
const RATE_L3 = 0.05;

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ ok: false, error: "Missing intent id" }, { status: 400 });

    const { data: intent, error } = await supabase
      .from("purchase_intents")
      .select("id,status,amount_usdc_atomic,ft_ref_code,lt_ref_code,tt_ref_code,created_at")
      .eq("id", id)
      .single();

    if (error || !intent) {
      return NextResponse.json({ ok: false, error: error?.message || "Intent not found" }, { status: 404 });
    }

    const amt = Number(intent.amount_usdc_atomic || 0);

    const payouts = [
      intent.ft_ref_code
        ? { level: 1, ref_code: intent.ft_ref_code, rate: RATE_L1, usdc_atomic: Math.round(amt * RATE_L1) }
        : null,
      intent.lt_ref_code
        ? { level: 2, ref_code: intent.lt_ref_code, rate: RATE_L2, usdc_atomic: Math.round(amt * RATE_L2) }
        : null,
      intent.tt_ref_code
        ? { level: 3, ref_code: intent.tt_ref_code, rate: RATE_L3, usdc_atomic: Math.round(amt * RATE_L3) }
        : null,
    ].filter(Boolean);

    const totalAtomic = payouts.reduce((s: number, p: any) => s + p.usdc_atomic, 0);

    return NextResponse.json({
      ok: true,
      intent: { id: intent.id, status: intent.status, amount_usdc_atomic: amt, created_at: intent.created_at },
      payouts,
      total_usdc_atomic: totalAtomic,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected server error" }, { status: 500 });
  }
}

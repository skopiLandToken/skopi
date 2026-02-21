import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_FORCE_CONFIRM_TOKEN || "";

  if (!expected) return json(500, { ok: false, error: "ADMIN_FORCE_CONFIRM_TOKEN is not set" });
  if (token !== expected) return json(401, { ok: false, error: "Unauthorized" });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: intent, error: intentErr } = await supabase
    .from("purchase_intents")
    .select("id,status,confirmed_at,tx_signature,tranche_id,tokens_skopi,price_usdc_used,amount_usdc_atomic,ft_ref_code,lt_ref_code,tt_ref_code")
    .eq("id", id)
    .single();

  if (intentErr) return json(400, { ok: false, error: intentErr.message });
  if (!intent) return json(404, { ok: false, error: "Intent not found" });

  let forced = false;

  // If not confirmed yet, force confirm with unique signature
  if (!(intent.status === "confirmed" && intent.confirmed_at)) {
    const uniqueSig = `TEST_FORCE_${id.slice(0, 8)}_${Date.now()}`;

    const { data: updated, error: updateErr } = await supabase
      .from("purchase_intents")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        tx_signature: uniqueSig,
        failure_reason: null,
      })
      .eq("id", id)
      .select("id,status,confirmed_at,tx_signature,tranche_id,tokens_skopi,price_usdc_used,amount_usdc_atomic,ft_ref_code,lt_ref_code,tt_ref_code")
      .single();

    if (updateErr) return json(500, { ok: false, error: updateErr.message });

    forced = true;
    (intent as any).status = updated.status;
    (intent as any).confirmed_at = updated.confirmed_at;
    (intent as any).tx_signature = updated.tx_signature;
    (intent as any).tranche_id = updated.tranche_id;
    (intent as any).tokens_skopi = updated.tokens_skopi;
    (intent as any).price_usdc_used = updated.price_usdc_used;
    (intent as any).amount_usdc_atomic = updated.amount_usdc_atomic;
    (intent as any).ft_ref_code = updated.ft_ref_code;
    (intent as any).lt_ref_code = updated.lt_ref_code;
    (intent as any).tt_ref_code = updated.tt_ref_code;
  }

  // Commit commissions (idempotent)
  const { data: commissions, error: cErr } = await supabase.rpc("commit_affiliate_commissions", {
    p_intent_id: id,
  });
  if (cErr) return json(500, { ok: false, error: cErr.message });

  // Finalize tranche decrement (idempotent-ish)
  const { error: tErr } = await supabase.rpc("finalize_tranche_on_confirm", {
    p_intent_id: id,
  });
  if (tErr) return json(500, { ok: false, error: tErr.message });

  return json(200, { ok: true, forced, intent, commissions: commissions ?? [] });
}

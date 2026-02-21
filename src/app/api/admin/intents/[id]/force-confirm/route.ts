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

  // Hard gate: must provide secret header
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_FORCE_CONFIRM_TOKEN || "";

  if (!expected) {
    return json(500, { ok: false, error: "ADMIN_FORCE_CONFIRM_TOKEN is not set" });
  }
  if (token !== expected) {
    return json(401, { ok: false, error: "Unauthorized" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: intent, error: intentErr } = await supabase
    .from("purchase_intents")
    .select("id,status,confirmed_at,tx_signature,amount_usdc_atomic,ft_ref_code,lt_ref_code,tt_ref_code")
    .eq("id", id)
    .single();

  if (intentErr) return json(400, { ok: false, error: intentErr.message });
  if (!intent) return json(404, { ok: false, error: "Intent not found" });

  // If already confirmed, (re)commit commissions (idempotent) and return
  if (intent.status === "confirmed" && intent.confirmed_at) {
    const { data: rows, error: rpcErr } = await supabase.rpc("commit_affiliate_commissions", {
      p_intent_id: id,
    });
    if (rpcErr) return json(500, { ok: false, error: rpcErr.message });

    return json(200, { ok: true, forced: false, intent, commissions: rows ?? [] });
  }

  // Unique test signature (tx_signature has UNIQUE constraint)
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
    .select("id,status,confirmed_at,tx_signature,updated_at,amount_usdc_atomic,ft_ref_code,lt_ref_code,tt_ref_code")
    .single();

  if (updateErr) return json(500, { ok: false, error: updateErr.message });

  const { data: rows, error: rpcErr } = await supabase.rpc("commit_affiliate_commissions", {
    p_intent_id: id,
  });
  if (rpcErr) return json(500, { ok: false, error: rpcErr.message });

  return json(200, { ok: true, forced: true, intent: updated, commissions: rows ?? [] });
}

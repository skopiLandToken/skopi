// ./src/app/api/purchase-intents/[id]/commit-commissions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  // Service role is required because we used SECURITY DEFINER functions,
  // but your existing admin routes likely already do this.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1) Ensure intent exists + confirmed
  const { data: intent, error: intentErr } = await supabase
    .from("purchase_intents")
    .select("id,status,confirmed_at")
    .eq("id", id)
    .single();

  if (intentErr) {
    return NextResponse.json({ ok: false, error: intentErr.message }, { status: 400 });
  }
  if (!intent) {
    return NextResponse.json({ ok: false, error: "Intent not found" }, { status: 404 });
  }
  if (intent.status !== "confirmed" || !intent.confirmed_at) {
    return NextResponse.json(
      { ok: false, error: "Intent is not confirmed yet", intent },
      { status: 400 }
    );
  }

  // 2) Call the DB function (idempotent)
  const { data: rows, error: rpcErr } = await supabase
    .rpc("commit_affiliate_commissions", { p_intent_id: id });

  if (rpcErr) {
    return NextResponse.json({ ok: false, error: rpcErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    intent_id: id,
    commissions: rows ?? [],
  });
}

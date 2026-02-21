// ./src/app/api/purchase-intents/[id]/commit-commissions/route.ts
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

  // 🔒 Admin gate (reuse the same token as force-confirm)
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

  // Ensure intent exists + confirmed
  const { data: intent, error: intentErr } = await supabase
    .from("purchase_intents")
    .select("id,status,confirmed_at")
    .eq("id", id)
    .single();

  if (intentErr) return json(400, { ok: false, error: intentErr.message });
  if (!intent) return json(404, { ok: false, error: "Intent not found" });
  if (intent.status !== "confirmed" || !intent.confirmed_at) {
    return json(400, { ok: false, error: "Intent is not confirmed yet", intent });
  }

  // Commit commissions (idempotent)
  const { data: rows, error: rpcErr } = await supabase.rpc("commit_affiliate_commissions", {
    p_intent_id: id,
  });

  if (rpcErr) return json(500, { ok: false, error: rpcErr.message });

  return json(200, { ok: true, intent_id: id, commissions: rows ?? [] });
}

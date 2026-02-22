import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

// Service client (DB writes + SECURITY DEFINER functions)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Anon client (used only to validate access tokens)
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1) Require auth token
    const auth = req.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const accessToken = m?.[1]?.trim();

    if (!accessToken) {
      return json(401, { ok: false, error: "Missing Authorization Bearer token" });
    }

    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return json(401, { ok: false, error: "Invalid/expired auth token" });
    }

    const userId = userData.user.id;

    // 2) Parse request
    const body = await req.json().catch(() => ({}));

    const amount_usdc_atomic = Number(body.amount_usdc_atomic ?? body.amount ?? 0);
    const reference_pubkey = String(body.reference_pubkey ?? "");
    const ft_ref_code = body.ft_ref_code ? String(body.ft_ref_code) : null;

    if (!Number.isFinite(amount_usdc_atomic) || amount_usdc_atomic <= 0) {
      return json(400, { ok: false, error: "amount_usdc_atomic must be a positive number" });
    }
    if (!reference_pubkey || reference_pubkey.length < 32) {
      return json(400, { ok: false, error: "reference_pubkey required" });
    }

    // 3) Create intent bound to ACTIVE tranche + user_id via RPC
    const { data, error } = await supabaseAdmin.rpc("create_purchase_intent_with_tranche", {
      p_amount_usdc_atomic: amount_usdc_atomic,
      p_reference_pubkey: reference_pubkey,
      p_ft_ref_code: ft_ref_code,
      p_user_id: userId,
    });

    if (error) return json(500, { ok: false, error: error.message });

    // RPC returns a table; normalize single row
    const row = Array.isArray(data) ? data[0] : data;
    return json(200, { ok: true, intent: row });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message || "Unexpected server error" });
  }
}

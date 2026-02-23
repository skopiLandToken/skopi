import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_FORCE_CONFIRM_TOKEN = process.env.ADMIN_FORCE_CONFIRM_TOKEN || "";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminToken = req.headers.get("x-admin-token") || "";

    // Test-mode safety: require admin token to "confirm" without real on-chain verification.
    if (!ADMIN_FORCE_CONFIRM_TOKEN || adminToken !== ADMIN_FORCE_CONFIRM_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid x-admin-token." },
        { status: 401 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const intentId = params.id;

    // 1) Mark intent as confirmed in DB (test mode)
    const { data: updatedIntent, error: updErr } = await supabase
      .from("purchase_intents")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        tx_signature: "TESTMODE",
        updated_at: new Date().toISOString(),
        failure_reason: null,
      })
      .eq("id", intentId)
      .select("id,status,confirmed_at,tx_signature,updated_at,ft_ref_code,lt_ref_code,tt_ref_code,amount_usdc_atomic")
      .single();

    if (updErr) {
      return NextResponse.json(
        { ok: false, error: updErr.message, details: updErr },
        { status: 500 }
      );
    }

    // 2) Commit affiliate commissions (creates rows in affiliate_commissions)
    // This function enforces "confirmed" + confirmed_at, so must happen AFTER update.
    const { data: commissions, error: comErr } = await supabase.rpc(
      "commit_affiliate_commissions",
      { p_intent_id: intentId }
    );

    if (comErr) {
      // Don't fail the whole verify if commissions fail; return both so we can debug safely.
      return NextResponse.json(
        {
          ok: true,
          intent: updatedIntent,
          commissions_ok: false,
          commissions_error: comErr.message,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      intent: updatedIntent,
      commissions_ok: true,
      commissions,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

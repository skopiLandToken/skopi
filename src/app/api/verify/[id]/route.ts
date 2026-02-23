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

    // Mark as confirmed in DB (test mode)
    const { data, error } = await supabase
      .from("purchase_intents")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        tx_signature: "TESTMODE",
        updated_at: new Date().toISOString(),
        failure_reason: null,
      })
      .eq("id", params.id)
      .select("id,status,confirmed_at,tx_signature,updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, intent: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

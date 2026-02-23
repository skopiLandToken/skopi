import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_FORCE_CONFIRM_TOKEN = process.env.ADMIN_FORCE_CONFIRM_TOKEN || "";

export async function POST(req: Request) {
  try {
    const adminToken = req.headers.get("x-admin-token") || "";
    if (!ADMIN_FORCE_CONFIRM_TOKEN || adminToken !== ADMIN_FORCE_CONFIRM_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid x-admin-token." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const ref_code = typeof body.ref_code === "string" ? body.ref_code.trim() : "";
    const paid_tx = typeof body.paid_tx === "string" ? body.paid_tx.trim() : "TEST-PAYOUT";

    if (!ref_code) {
      return NextResponse.json({ ok: false, error: "ref_code required" }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("affiliate_commissions")
      .update({
        status: "paid",
        paid_at: now,
        paid_tx,
      })
      .eq("ref_code", ref_code)
      .eq("status", "pending")
      .select("id,ref_code,usdc_atomic,status,paid_at,paid_tx");

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, updated: data?.length ?? 0, rows: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

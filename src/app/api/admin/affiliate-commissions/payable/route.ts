import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

function requireAdmin(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || "";
  const expected = process.env.ADMIN_FORCE_CONFIRM_TOKEN || "";
  if (!expected) return { ok: false as const, status: 500, error: "ADMIN_FORCE_CONFIRM_TOKEN is not set" };
  if (token !== expected) return { ok: false as const, status: 401, error: "Unauthorized" };
  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    // Join marketing_partners to attach payout wallet for each ref_code
    const { data, error } = await supabase
      .from("affiliate_commissions")
      .select(`
        id,intent_id,level,ref_code,usdc_atomic,status,payable_at,created_at,paid_at,paid_tx,
        marketing_partners:ref_code (
          payout_wallet_address
        )
      `)
      .in("status", ["pending", "payable"])
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Flatten wallet field for the payout script
    const rows = (data || []).map((r: any) => ({
      ...r,
      payout_wallet_address: r?.marketing_partners?.payout_wallet_address || null,
    }));

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected server error" }, { status: 500 });
  }
}

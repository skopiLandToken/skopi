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
    // 1) Fetch payable rows (pending + payable)
    const { data: comms, error: commErr } = await supabase
      .from("affiliate_commissions")
      .select("id,intent_id,level,ref_code,usdc_atomic,status,payable_at,created_at,paid_at,paid_tx")
      .in("status", ["pending", "payable"])
      .order("created_at", { ascending: true })
      .limit(500);

    if (commErr) {
      return NextResponse.json({ ok: false, error: commErr.message }, { status: 500 });
    }

    const rows = comms || [];
    const refCodes = [...new Set(rows.map((r: any) => r.ref_code).filter(Boolean))];

    // 2) Fetch payout wallets for those ref codes
    let walletsByRef: Record<string, string | null> = {};
    if (refCodes.length) {
      const { data: partners, error: mpErr } = await supabase
        .from("marketing_partners")
        .select("referral_code,payout_wallet_address")
        .in("referral_code", refCodes);

      if (mpErr) {
        return NextResponse.json({ ok: false, error: mpErr.message }, { status: 500 });
      }

      walletsByRef = Object.fromEntries(
        (partners || []).map((p: any) => [p.referral_code, p.payout_wallet_address ?? null])
      );
    }

    // 3) Merge wallet onto rows
    const merged = rows.map((r: any) => ({
      ...r,
      payout_wallet_address: walletsByRef[r.ref_code] ?? null,
    }));

    return NextResponse.json({ ok: true, rows: merged });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}

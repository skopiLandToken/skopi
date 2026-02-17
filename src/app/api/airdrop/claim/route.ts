import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const campaignId = String(body?.campaign_id || "").trim();
    const wallet = String(body?.wallet_address || "").trim();
    const amount = Number(body?.amount_tokens || 0);

    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "campaign_id is required" }, { status: 400 });
    }

    if (!wallet || wallet.length < 20) {
      return NextResponse.json({ ok: false, error: "wallet_address is invalid" }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "amount_tokens must be > 0" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("airdrop_claim_fcfs", {
      p_campaign_id: campaignId,
      p_wallet: wallet,
      p_amount: amount,
      p_user_id: null,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return NextResponse.json({ ok: false, error: "No response from claim function" }, { status: 500 });
    }

    if (!row.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: row.error || "claim_failed",
          allocation_id: row.allocation_id,
          remaining_tokens: row.remaining_tokens,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      allocation_id: row.allocation_id,
      remaining_tokens: row.remaining_tokens,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

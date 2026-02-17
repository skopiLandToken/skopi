import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const wallet = String(url.searchParams.get("wallet_address") || "").trim();

    if (!wallet) {
      return NextResponse.json({ ok: false, error: "wallet_address is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("airdrop_allocations")
      .select("id,campaign_id,wallet_address,total_tokens,locked_tokens,claimable_tokens,lock_end_at,status,tx_signature,created_at,updated_at")
      .eq("wallet_address", wallet)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, allocations: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

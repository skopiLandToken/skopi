import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const campaignId = String(url.searchParams.get("campaign_id") || "").trim();
    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "campaign_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("airdrop_tasks")
      .select("id,campaign_id,code,title,description,bounty_tokens,requires_manual,max_per_user,active,sort_order")
      .eq("campaign_id", campaignId)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, tasks: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

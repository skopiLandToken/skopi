import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminAuthorized } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    if (!(await isAdminAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const campaignId = String(url.searchParams.get("campaign_id") || "").trim();
    const action = String(url.searchParams.get("action") || "").trim();
    const from = String(url.searchParams.get("from") || "").trim();
    const to = String(url.searchParams.get("to") || "").trim();

    let q = supabase
      .from("airdrop_audit_log")
      .select("id,action,actor,campaign_id,task_id,submission_id,allocation_id,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (campaignId) q = q.eq("campaign_id", campaignId);
    if (action) q = q.eq("action", action);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);

    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, logs: data || [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const wallet = String(url.searchParams.get("wallet_address") || "").trim();
    const campaignId = String(url.searchParams.get("campaign_id") || "").trim();

    if (!wallet) {
      return NextResponse.json({ ok: false, error: "wallet_address is required" }, { status: 400 });
    }

    let q = supabase
      .from("airdrop_submissions")
      .select("id,campaign_id,task_id,wallet_address,handle,evidence_url,state,notes,submitted_at,reviewed_at,reviewer")
      .eq("wallet_address", wallet)
      .order("submitted_at", { ascending: false })
      .limit(200);

    if (campaignId) q = q.eq("campaign_id", campaignId);

    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const rows = data || [];
    const taskIds = [...new Set(rows.map((r) => r.task_id).filter(Boolean))];

    let taskMap: Record<string, { code: string; title: string }> = {};
    if (taskIds.length > 0) {
      const { data: taskRows, error: taskErr } = await supabase
        .from("airdrop_tasks")
        .select("id,code,title")
        .in("id", taskIds);

      if (taskErr) {
        return NextResponse.json({ ok: false, error: taskErr.message }, { status: 500 });
      }

      taskMap = Object.fromEntries((taskRows || []).map((t) => [t.id, { code: t.code, title: t.title }]));
    }

    const submissions = rows.map((s) => ({
      ...s,
      task_code: taskMap[s.task_id]?.code || null,
      task_title: taskMap[s.task_id]?.title || null,
    }));

    return NextResponse.json({ ok: true, submissions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const adminReadToken = process.env.ADMIN_READ_TOKEN;

function isAuthorized(req: Request) {
  if (!adminReadToken) return false;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token === adminReadToken;
}

export async function GET(req: Request) {
  try {
    if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const campaignId = String(url.searchParams.get("campaign_id") || "").trim();

    let q = supabase
      .from("airdrop_campaigns")
      .select("id,name,status,pool_tokens,distributed_tokens,created_at")
      .order("created_at", { ascending: false });

    if (campaignId) q = q.eq("id", campaignId);

    const { data: campaigns, error: campErr } = await q;
    if (campErr) return NextResponse.json({ ok: false, error: campErr.message }, { status: 500 });

    const rows = campaigns || [];
    const report = [];

    for (const c of rows) {
      const { data: allocs, error: allocErr } = await supabase
        .from("airdrop_allocations")
        .select("total_tokens,status")
        .eq("campaign_id", c.id);

      if (allocErr) return NextResponse.json({ ok: false, error: allocErr.message }, { status: 500 });

      const allocationSum = (allocs || []).reduce((sum, a) => sum + Number(a.total_tokens || 0), 0);
      const distributed = Number(c.distributed_tokens || 0);
      const pool = c.pool_tokens == null ? null : Number(c.pool_tokens);
      const drift = Number((distributed - allocationSum).toFixed(6));
      const remaining = pool == null ? null : Number((pool - distributed).toFixed(6));

      report.push({
        campaign_id: c.id,
        campaign_name: c.name,
        status: c.status,
        pool_tokens: pool,
        distributed_tokens: distributed,
        allocations_total_tokens: Number(allocationSum.toFixed(6)),
        drift_tokens: drift,
        remaining_tokens: remaining,
        ok: Math.abs(drift) < 0.000001,
      });
    }

    return NextResponse.json({
      ok: true,
      checked_campaigns: report.length,
      mismatches: report.filter((r) => !r.ok).length,
      report,
      checked_at: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

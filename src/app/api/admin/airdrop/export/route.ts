import { createClient } from "@supabase/supabase-js";
import { isAdminAuthorized } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function toCsv(headers: string[], rows: Array<Record<string, unknown>>) {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(req: Request) {
  if (!(await isAdminAuthorized(req))) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
  }

  try {
    const url = new URL(req.url);
    const type = String(url.searchParams.get("type") || "submissions").trim();
    const campaignId = String(url.searchParams.get("campaign_id") || "").trim();

    if (type === "submissions") {
      let q = supabase
        .from("airdrop_submissions")
        .select("id,campaign_id,task_id,user_id,wallet_address,handle,evidence_url,state,notes,submitted_at,reviewed_at,reviewer")
        .order("submitted_at", { ascending: false })
        .limit(5000);
      if (campaignId) q = q.eq("campaign_id", campaignId);
      const { data, error } = await q;
      if (error) return new Response(error.message, { status: 500 });

      const headers = ["id","campaign_id","task_id","user_id","wallet_address","handle","evidence_url","state","notes","submitted_at","reviewed_at","reviewer"];
      const csv = toCsv(headers, (data || []) as Array<Record<string, unknown>>);
      return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=airdrop-submissions.csv` } });
    }

    if (type === "allocations") {
      let q = supabase
        .from("airdrop_allocations")
        .select("id,campaign_id,user_id,wallet_address,total_tokens,locked_tokens,claimable_tokens,lock_end_at,status,tx_signature,created_at,updated_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (campaignId) q = q.eq("campaign_id", campaignId);
      const { data, error } = await q;
      if (error) return new Response(error.message, { status: 500 });

      const headers = ["id","campaign_id","user_id","wallet_address","total_tokens","locked_tokens","claimable_tokens","lock_end_at","status","tx_signature","created_at","updated_at"];
      const csv = toCsv(headers, (data || []) as Array<Record<string, unknown>>);
      return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=airdrop-allocations.csv` } });
    }

    if (type === "campaigns") {
      const { data, error } = await supabase
        .from("airdrop_campaigns")
        .select("id,name,status,pool_tokens,distributed_tokens,per_user_cap,lock_days,start_at,end_at,created_at,updated_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) return new Response(error.message, { status: 500 });

      const headers = ["id","name","status","pool_tokens","distributed_tokens","per_user_cap","lock_days","start_at","end_at","created_at","updated_at"];
      const csv = toCsv(headers, (data || []) as Array<Record<string, unknown>>);
      return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=airdrop-campaigns.csv` } });
    }

    if (type === "audit") {
      let q = supabase
        .from("airdrop_audit_log")
        .select("id,action,actor,campaign_id,task_id,submission_id,allocation_id,metadata,created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (campaignId) q = q.eq("campaign_id", campaignId);
      const { data, error } = await q;
      if (error) return new Response(error.message, { status: 500 });

      const headers = ["id","action","actor","campaign_id","task_id","submission_id","allocation_id","metadata","created_at"];
      const rows = (data || []).map((r) => ({ ...r, metadata: JSON.stringify(r.metadata || {}) }));
      const csv = toCsv(headers, rows as Array<Record<string, unknown>>);
      return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=airdrop-audit-log.csv` } });
    }

    return new Response(JSON.stringify({ ok: false, error: "Unsupported type" }), { status: 400, headers: { "content-type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

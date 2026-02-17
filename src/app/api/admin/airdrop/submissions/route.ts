import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminAuthorized } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function allocate(campaignId: string, wallet: string, amount: number, userId?: string | null) {
  const { data, error } = await supabase.rpc("airdrop_allocate_task_fcfs", {
    p_campaign_id: campaignId,
    p_wallet: wallet,
    p_amount: amount,
    p_user_id: userId || null,
  });
  if (error) return { ok: false, error: error.message };
  return Array.isArray(data) ? data[0] : data;
}

export async function GET(req: Request) {
  try {
    if (!(await isAdminAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const campaignId = String(url.searchParams.get("campaign_id") || "").trim();
    const state = String(url.searchParams.get("state") || "pending_review").trim();

    let q = supabase
      .from("airdrop_submissions")
      .select("id,campaign_id,task_id,user_id,wallet_address,handle,evidence_url,state,submitted_at,reviewed_at,reviewer,notes")
      .order("submitted_at", { ascending: false })
      .limit(200);

    if (campaignId) q = q.eq("campaign_id", campaignId);
    if (state && state !== "all") q = q.eq("state", state);

    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, submissions: data || [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await isAdminAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const action = String(body?.action || "").trim().toLowerCase();
    const reviewer = String(body?.reviewer || "admin").trim();
    const notes = body?.notes ? String(body.notes).trim() : "";

    const singleId = String(body?.submission_id || "").trim();
    const batchIds = Array.isArray(body?.submission_ids) ? body.submission_ids.map((x: unknown) => String(x).trim()).filter(Boolean) : [];
    const submissionIds = batchIds.length > 0 ? batchIds : (singleId ? [singleId] : []);

    if (submissionIds.length === 0 || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ ok: false, error: "submission_id or submission_ids[] and valid action required" }, { status: 400 });
    }

    if (action === "reject" && !notes) {
      return NextResponse.json({ ok: false, error: "reject_reason_required" }, { status: 400 });
    }

    const results: Array<{ submission_id: string; ok: boolean; error?: string; allocation_id?: string; remaining_tokens?: number }> = [];

    for (const submissionId of submissionIds) {
      const { data: sub, error: subErr } = await supabase
        .from("airdrop_submissions")
        .select("id,campaign_id,task_id,user_id,wallet_address,state")
        .eq("id", submissionId)
        .single();

      if (subErr || !sub) {
        results.push({ submission_id: submissionId, ok: false, error: "submission_not_found" });
        continue;
      }
      if (sub.state !== "pending_review") {
        results.push({ submission_id: submissionId, ok: false, error: "submission_not_pending" });
        continue;
      }

      if (action === "reject") {
        const { error } = await supabase
          .from("airdrop_submissions")
          .update({ state: "revoked", reviewed_at: new Date().toISOString(), reviewer, notes })
          .eq("id", submissionId);

        if (error) results.push({ submission_id: submissionId, ok: false, error: error.message });
        else results.push({ submission_id: submissionId, ok: true });
        continue;
      }

      const { data: task, error: taskErr } = await supabase
        .from("airdrop_tasks")
        .select("id,bounty_tokens")
        .eq("id", sub.task_id)
        .single();

      if (taskErr || !task) {
        results.push({ submission_id: submissionId, ok: false, error: "task_not_found" });
        continue;
      }

      const alloc = await allocate(sub.campaign_id, sub.wallet_address, Number(task.bounty_tokens), sub.user_id || null);
      if (!alloc?.ok) {
        results.push({ submission_id: submissionId, ok: false, error: alloc?.error || "allocation_failed" });
        continue;
      }

      const { error } = await supabase
        .from("airdrop_submissions")
        .update({
          state: "verified_manual",
          reviewed_at: new Date().toISOString(),
          reviewer,
          notes: notes || "Approved by reviewer",
        })
        .eq("id", submissionId);

      if (error) results.push({ submission_id: submissionId, ok: false, error: error.message });
      else results.push({ submission_id: submissionId, ok: true, allocation_id: alloc.allocation_id, remaining_tokens: alloc.remaining_tokens });
    }

    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;
    return NextResponse.json({ ok: true, action, total: results.length, ok_count: okCount, fail_count: failCount, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

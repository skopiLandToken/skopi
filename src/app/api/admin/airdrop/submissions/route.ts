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

async function allocate(campaignId: string, wallet: string, amount: number, userId?: string | null) {
  const { data, error } = await supabase.rpc("airdrop_claim_fcfs", {
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
    if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

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
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!isAuthorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const submissionId = String(body?.submission_id || "").trim();
    const action = String(body?.action || "").trim().toLowerCase(); // approve/reject
    const reviewer = String(body?.reviewer || "admin").trim();
    const notes = body?.notes ? String(body.notes) : null;

    if (!submissionId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ ok: false, error: "submission_id and valid action required" }, { status: 400 });
    }

    const { data: sub, error: subErr } = await supabase
      .from("airdrop_submissions")
      .select("id,campaign_id,task_id,user_id,wallet_address,state")
      .eq("id", submissionId)
      .single();
    if (subErr || !sub) return NextResponse.json({ ok: false, error: "Submission not found" }, { status: 404 });

    if (action === "reject") {
      const { error } = await supabase
        .from("airdrop_submissions")
        .update({
          state: "revoked",
          reviewed_at: new Date().toISOString(),
          reviewer,
          notes: notes || "Rejected by reviewer",
        })
        .eq("id", submissionId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: "rejected" });
    }

    const { data: task, error: taskErr } = await supabase
      .from("airdrop_tasks")
      .select("id,bounty_tokens")
      .eq("id", sub.task_id)
      .single();

    if (taskErr || !task) return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });

    const alloc = await allocate(sub.campaign_id, sub.wallet_address, Number(task.bounty_tokens), sub.user_id || null);
    if (!alloc?.ok) {
      return NextResponse.json({ ok: false, error: alloc?.error || "Allocation failed" }, { status: 400 });
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

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, action: "approved", allocation_id: alloc.allocation_id, remaining_tokens: alloc.remaining_tokens });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

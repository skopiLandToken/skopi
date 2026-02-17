import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_SUBMISSIONS_PER_HOUR = 8;

function normalizeEvidenceUrl(raw: string) {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return raw.trim();
  }
}

function allowedDomainsForTask(taskCode: string): string[] | null {
  const code = taskCode.toLowerCase();
  if (code.includes("x") || code.includes("twitter")) return ["x.com", "twitter.com"];
  if (code.includes("tiktok")) return ["tiktok.com"];
  if (code.includes("instagram") || code.includes("insta")) return ["instagram.com"];
  if (code.includes("youtube") || code.includes("yt")) return ["youtube.com", "youtu.be"];
  return null;
}

function domainAllowed(taskCode: string, evidenceUrl: string) {
  const allow = allowedDomainsForTask(taskCode);
  if (!allow) return true;
  try {
    const host = new URL(evidenceUrl).hostname.toLowerCase();
    return allow.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

async function allocateIfEligible(campaignId: string, wallet: string, bounty: number, userId?: string | null) {
  const { data, error } = await supabase.rpc("airdrop_allocate_task_fcfs", {
    p_campaign_id: campaignId,
    p_wallet: wallet,
    p_amount: bounty,
    p_user_id: userId || null,
  });
  if (error) return { ok: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return row;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const campaignId = String(body?.campaign_id || "").trim();
    const taskCode = String(body?.task_code || "").trim().toLowerCase();
    const wallet = String(body?.wallet_address || "").trim();
    const handle = body?.handle ? String(body.handle).trim() : null;
    const evidenceUrlRaw = String(body?.evidence_url || "").trim();
    const evidenceUrl = normalizeEvidenceUrl(evidenceUrlRaw);
    const userId = body?.user_id ? String(body.user_id) : null;
    const clientSubmissionId = body?.client_submission_id ? String(body.client_submission_id).trim() : null;

    if (!campaignId || !taskCode || !wallet || !evidenceUrl) {
      return NextResponse.json({ ok: false, error: "campaign_id, task_code, wallet_address, evidence_url are required" }, { status: 400 });
    }

    if (!/^https?:\/\//i.test(evidenceUrl)) {
      return NextResponse.json({ ok: false, error: "evidence_url_invalid" }, { status: 400 });
    }

    if (!domainAllowed(taskCode, evidenceUrl)) {
      return NextResponse.json({ ok: false, error: "evidence_domain_not_allowed" }, { status: 400 });
    }

    // Wallet-level rate limit
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: rateErr } = await supabase
      .from("airdrop_submissions")
      .select("id", { count: "exact", head: true })
      .eq("wallet_address", wallet)
      .gte("submitted_at", since);

    if (rateErr) return NextResponse.json({ ok: false, error: rateErr.message }, { status: 500 });
    if ((recentCount || 0) >= MAX_SUBMISSIONS_PER_HOUR) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    // Campaign must be active
    const { data: campaign, error: campaignErr } = await supabase
      .from("airdrop_campaigns")
      .select("id,status")
      .eq("id", campaignId)
      .single();

    if (campaignErr || !campaign) return NextResponse.json({ ok: false, error: "Campaign not found" }, { status: 404 });
    if (campaign.status !== "active") return NextResponse.json({ ok: false, error: "Campaign not active" }, { status: 400 });

    // Task must exist and active
    const { data: task, error: taskErr } = await supabase
      .from("airdrop_tasks")
      .select("id,code,bounty_tokens,requires_manual,max_per_user,active")
      .eq("campaign_id", campaignId)
      .eq("code", taskCode)
      .single();

    if (taskErr || !task) return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
    if (!task.active) return NextResponse.json({ ok: false, error: "Task inactive" }, { status: 400 });

    // Idempotency guard: same client submission intent returns existing row
    if (clientSubmissionId) {
      const { data: existing, error: existingErr } = await supabase
        .from("airdrop_submissions")
        .select("id,campaign_id,task_id,state,submitted_at")
        .eq("campaign_id", campaignId)
        .eq("task_id", task.id)
        .eq("wallet_address", wallet)
        .eq("client_submission_id", clientSubmissionId)
        .maybeSingle();

      if (existingErr) return NextResponse.json({ ok: false, error: existingErr.message }, { status: 500 });
      if (existing) {
        return NextResponse.json({ ok: true, submission: existing, idempotent: true, message: "Already received this submission." });
      }
    }

    // Duplicate evidence protection for same campaign/task
    const { data: existingEvidence, error: dupErr } = await supabase
      .from("airdrop_submissions")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("task_id", task.id)
      .eq("evidence_url", evidenceUrl)
      .limit(1);

    if (dupErr) return NextResponse.json({ ok: false, error: dupErr.message }, { status: 500 });
    if ((existingEvidence || []).length > 0) {
      return NextResponse.json({ ok: false, error: "duplicate_evidence" }, { status: 400 });
    }

    // Task-level submission cap per wallet (if configured)
    if (task.max_per_user != null) {
      const { count, error: countErr } = await supabase
        .from("airdrop_submissions")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("task_id", task.id)
        .eq("wallet_address", wallet)
        .in("state", ["pending_review", "verified_auto", "verified_manual"]);

      if (countErr) return NextResponse.json({ ok: false, error: countErr.message }, { status: 500 });
      if ((count || 0) >= Number(task.max_per_user)) {
        return NextResponse.json({ ok: false, error: "task_limit_reached" }, { status: 400 });
      }
    }

    const submissionState = task.requires_manual ? "pending_review" : "verified_auto";

    const { data: submission, error: submitErr } = await supabase
      .from("airdrop_submissions")
      .insert({
        campaign_id: campaignId,
        task_id: task.id,
        user_id: userId,
        wallet_address: wallet,
        handle,
        evidence_url: evidenceUrl,
        client_submission_id: clientSubmissionId,
        state: submissionState,
        notes: task.requires_manual ? "Requires manual review" : "Auto-verified by basic checks",
      })
      .select("id,campaign_id,task_id,state,submitted_at")
      .single();

    if (submitErr) return NextResponse.json({ ok: false, error: submitErr.message }, { status: 500 });

    if (!task.requires_manual) {
      const alloc = await allocateIfEligible(campaignId, wallet, Number(task.bounty_tokens), userId);
      if (!alloc?.ok) {
        return NextResponse.json({
          ok: true,
          submission,
          allocation: { ok: false, error: alloc?.error || "allocation_failed" },
          message: "Submission saved, allocation not completed",
        });
      }

      return NextResponse.json({
        ok: true,
        submission,
        allocation: { ok: true, allocation_id: alloc.allocation_id, remaining_tokens: alloc.remaining_tokens },
      });
    }

    return NextResponse.json({ ok: true, submission, message: "Submission queued for manual review" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

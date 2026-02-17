import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { logAirdropAudit } from "@/lib/airdrop-audit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function GET(req: Request) {
  try {
    if (!(await isAdminAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const campaignId = String(url.searchParams.get("campaign_id") || "").trim();
    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "campaign_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("airdrop_tasks")
      .select("id,campaign_id,code,title,description,bounty_tokens,requires_manual,max_per_user,allowed_domains,requires_https,min_evidence_length,active,sort_order,created_at,updated_at")
      .eq("campaign_id", campaignId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, tasks: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

function normalizeTaskPayload(body: any) {
  const allowedDomains = Array.isArray(body?.allowed_domains)
    ? body.allowed_domains.map((x: unknown) => String(x).trim().toLowerCase()).filter(Boolean)
    : [];

  return {
    code: body?.code ? String(body.code).trim().toLowerCase() : undefined,
    title: body?.title ? String(body.title).trim() : undefined,
    description: body?.description != null ? String(body.description) : null,
    bounty_tokens: body?.bounty_tokens != null ? Number(body.bounty_tokens) : undefined,
    requires_manual: body?.requires_manual != null ? !!body.requires_manual : undefined,
    max_per_user: body?.max_per_user != null && body.max_per_user !== "" ? Number(body.max_per_user) : null,
    allowed_domains: allowedDomains.length > 0 ? allowedDomains : null,
    requires_https: body?.requires_https != null ? !!body.requires_https : undefined,
    min_evidence_length: body?.min_evidence_length != null ? Number(body.min_evidence_length) : undefined,
    active: body?.active != null ? !!body.active : undefined,
    sort_order: body?.sort_order != null ? Number(body.sort_order) : undefined,
  };
}

export async function POST(req: Request) {
  try {
    if (!(await isAdminAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const campaignId = String(body?.campaign_id || "").trim();
    const payload = normalizeTaskPayload(body);

    if (!campaignId) return NextResponse.json({ ok: false, error: "campaign_id is required" }, { status: 400 });
    if (!payload.code) return NextResponse.json({ ok: false, error: "code is required" }, { status: 400 });
    if (!payload.title) return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 });
    if (!Number.isFinite(Number(payload.bounty_tokens ?? 0)) || Number(payload.bounty_tokens ?? 0) < 0) {
      return NextResponse.json({ ok: false, error: "bounty_tokens must be >= 0" }, { status: 400 });
    }

    const insert = {
      campaign_id: campaignId,
      code: payload.code,
      title: payload.title,
      description: payload.description,
      bounty_tokens: Number(payload.bounty_tokens ?? 0),
      requires_manual: payload.requires_manual ?? false,
      max_per_user: payload.max_per_user,
      allowed_domains: payload.allowed_domains,
      requires_https: payload.requires_https ?? true,
      min_evidence_length: Number(payload.min_evidence_length ?? 10),
      active: payload.active ?? true,
      sort_order: Number(payload.sort_order ?? 0),
    };

    const { data, error } = await supabase
      .from("airdrop_tasks")
      .insert(insert)
      .select("id,campaign_id,code,title,bounty_tokens,requires_manual,max_per_user,allowed_domains,requires_https,min_evidence_length,active,sort_order,created_at")
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await logAirdropAudit({
      action: "task_created",
      campaign_id: campaignId,
      task_id: data?.id,
      metadata: { code: data?.code, title: data?.title },
    });

    return NextResponse.json({ ok: true, task: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await isAdminAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const taskId = String(body?.task_id || "").trim();
    if (!taskId) return NextResponse.json({ ok: false, error: "task_id is required" }, { status: 400 });

    const payload = normalizeTaskPayload(body);
    const update: any = {};

    if (payload.code) update.code = payload.code;
    if (payload.title) update.title = payload.title;
    if (body?.description !== undefined) update.description = payload.description;
    if (payload.bounty_tokens !== undefined) {
      if (!Number.isFinite(Number(payload.bounty_tokens)) || Number(payload.bounty_tokens) < 0) {
        return NextResponse.json({ ok: false, error: "bounty_tokens must be >= 0" }, { status: 400 });
      }
      update.bounty_tokens = Number(payload.bounty_tokens);
    }
    if (payload.requires_manual !== undefined) update.requires_manual = payload.requires_manual;
    if (body?.max_per_user !== undefined) update.max_per_user = payload.max_per_user;
    if (body?.allowed_domains !== undefined) update.allowed_domains = payload.allowed_domains;
    if (payload.requires_https !== undefined) update.requires_https = payload.requires_https;
    if (payload.min_evidence_length !== undefined) update.min_evidence_length = Number(payload.min_evidence_length);
    if (payload.active !== undefined) update.active = payload.active;
    if (payload.sort_order !== undefined) update.sort_order = Number(payload.sort_order);

    const { data, error } = await supabase
      .from("airdrop_tasks")
      .update(update)
      .eq("id", taskId)
      .select("id,campaign_id,code,title,description,bounty_tokens,requires_manual,max_per_user,allowed_domains,requires_https,min_evidence_length,active,sort_order,updated_at")
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    await logAirdropAudit({
      action: Object.prototype.hasOwnProperty.call(update, "active") ? "task_toggled" : "task_updated",
      campaign_id: data?.campaign_id,
      task_id: data?.id,
      metadata: { update_fields: Object.keys(update), active: data?.active },
    });

    return NextResponse.json({ ok: true, task: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

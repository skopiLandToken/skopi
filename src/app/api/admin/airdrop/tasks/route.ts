import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminAuthorized } from "@/lib/admin-auth";

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
      .select("id,campaign_id,code,title,description,bounty_tokens,requires_manual,max_per_user,active,sort_order,created_at,updated_at")
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

export async function POST(req: Request) {
  try {
    if (!(await isAdminAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const campaignId = String(body?.campaign_id || "").trim();
    const code = String(body?.code || "").trim().toLowerCase();
    const title = String(body?.title || "").trim();
    const bounty = Number(body?.bounty_tokens || 0);

    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "campaign_id is required" }, { status: 400 });
    }
    if (!code) {
      return NextResponse.json({ ok: false, error: "code is required" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 });
    }
    if (!Number.isFinite(bounty) || bounty < 0) {
      return NextResponse.json({ ok: false, error: "bounty_tokens must be >= 0" }, { status: 400 });
    }

    const insert = {
      campaign_id: campaignId,
      code,
      title,
      description: body?.description ? String(body.description) : null,
      bounty_tokens: bounty,
      requires_manual: !!body?.requires_manual,
      max_per_user: body?.max_per_user ? Number(body.max_per_user) : null,
      active: body?.active ?? true,
      sort_order: body?.sort_order ? Number(body.sort_order) : 0,
    };

    const { data, error } = await supabase
      .from("airdrop_tasks")
      .insert(insert)
      .select("id,campaign_id,code,title,bounty_tokens,requires_manual,max_per_user,active,sort_order,created_at")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, task: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

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

    const { data, error } = await supabase
      .from("airdrop_campaigns")
      .select("id,name,description,status,start_at,end_at,lock_days,pool_tokens,distributed_tokens,per_user_cap,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, campaigns: data || [] });
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
    const name = String(body?.name || "").trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
    }

    const insert = {
      name,
      description: body?.description ? String(body.description) : null,
      status: body?.status ? String(body.status) : "draft",
      start_at: body?.start_at || null,
      end_at: body?.end_at || null,
      lock_days: Number(body?.lock_days || 90),
      pool_tokens: body?.pool_tokens ?? null,
      per_user_cap: body?.per_user_cap ?? null,
      distributed_tokens: 0,
    };

    const { data, error } = await supabase
      .from("airdrop_campaigns")
      .insert(insert)
      .select("id,name,status,lock_days,pool_tokens,distributed_tokens,created_at")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, campaign: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("airdrop_campaigns")
      .select("id,name,description,status,start_at,end_at,lock_days,pool_tokens,distributed_tokens,per_user_cap,created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const campaigns = (data || []).map((c: any) => {
      const pool = c.pool_tokens == null ? null : Number(c.pool_tokens);
      const distributed = Number(c.distributed_tokens || 0);
      const remaining = pool == null ? null : Math.max(pool - distributed, 0);
      return { ...c, remaining_tokens: remaining };
    });

    return NextResponse.json({ ok: true, campaigns });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

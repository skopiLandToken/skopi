import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ ok: false, error: "Missing commission id" }, { status: 400 });

    let body: any = {};
    try { body = await req.json(); } catch {}
    const paidTx = body?.paidTx ?? null;

    const { data, error } = await supabase
      .from("affiliate_commissions")
      .update({ status: "paid", paid_at: new Date().toISOString(), paid_tx: paidTx })
      .eq("id", id)
      .select("id,status,paid_at,paid_tx")
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, row: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected server error" }, { status: 500 });
  }
}

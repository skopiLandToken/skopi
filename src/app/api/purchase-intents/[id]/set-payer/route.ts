import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const p = await context.params;
    const id = String(p?.id || "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "Missing intent id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const payer = String(body?.payer || "").trim();
    if (!payer) return NextResponse.json({ ok: false, error: "Missing payer" }, { status: 400 });

    // only set payer_pubkey if it's empty (idempotent)
    const { data, error } = await supabase
      .from("purchase_intents")
      .update({ payer_pubkey: payer })
      .eq("id", id)
      .is("payer_pubkey", null)
      .select("id,payer_pubkey")
      .single();

    if (error) {
      // If it was already set, return ok anyway
      return NextResponse.json({ ok: true, alreadySet: true }, { status: 200 });
    }

    return NextResponse.json({ ok: true, intent: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}

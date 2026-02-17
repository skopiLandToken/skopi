import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("purchase_intents")
      .select(
        "id,status,amount_usdc_atomic,wallet_address,reference_pubkey,tx_signature,ft_utm_source,ft_utm_campaign,created_at,updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, intents: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}

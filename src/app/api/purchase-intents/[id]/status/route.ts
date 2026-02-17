import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function GET(
_req: Request,
context: { params: Promise<{ id: string }> }
) {
try {
const { id } = await context.params;

if (!id) {
return NextResponse.json({ ok: false, error: "Missing intent id" }, { status: 400 });
}

const { data, error } = await supabase
.from("purchase_intents")
.select("id,status,amount_usdc_atomic,treasury_address,usdc_mint,reference_pubkey,tx_signature,created_at,updated_at")
.eq("id", id)
.single();

if (error) {
return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
}

return NextResponse.json({ ok: true, intent: data });
} catch (e: any) {
return NextResponse.json(
{ ok: false, error: e?.message || "Unexpected server error" },
{ status: 500 }
);
}
}

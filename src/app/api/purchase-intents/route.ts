import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Keypair } from "@solana/web3.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TREASURY_ADDRESS =
process.env.SKOPI_TREASURY_ADDRESS ||
"EoGpGWpy5ii1TcWcGmQahUVBYGtN2x5RhkBQ6jJNGRHd";

const USDC_MINT =
process.env.USDC_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const supabase = createClient(supabaseUrl, serviceRoleKey);

type Body = {
amountUsdc: number;
walletAddress?: string | null;
userId?: string | null;
landingPath?: string | null;
referrer?: string | null;
utm?: {
source?: string | null;
medium?: string | null;
campaign?: string | null;
content?: string | null;
term?: string | null;
};
lastTouch?: {
source?: string | null;
medium?: string | null;
campaign?: string | null;
content?: string | null;
term?: string | null;
landingPath?: string | null;
referrer?: string | null;
};
};

function toAtomicUsdc(amountUsdc: number) {
return Math.round(amountUsdc * 1_000_000);
}

function bad(msg: string, code = 400) {
return NextResponse.json({ ok: false, error: msg }, { status: code });
}

export async function POST(req: NextRequest) {
try {
if (!supabaseUrl || !serviceRoleKey) {
return bad("Missing Supabase environment variables", 500);
}

const body = (await req.json()) as Body;

if (!body || typeof body.amountUsdc !== "number") {
return bad("amountUsdc is required and must be a number");
}

if (!Number.isFinite(body.amountUsdc) || body.amountUsdc <= 0) {
return bad("amountUsdc must be > 0");
}

if (body.amountUsdc < 1) {
return bad("Minimum purchase is 1 USDC");
}

const amountAtomic = toAtomicUsdc(body.amountUsdc);
const referencePubkey = Keypair.generate().publicKey.toBase58();

const insertPayload = {
status: "created",
amount_usdc_atomic: amountAtomic,
treasury_address: TREASURY_ADDRESS,
usdc_mint: USDC_MINT,
reference_pubkey: referencePubkey,
wallet_address: body.walletAddress ?? null,
user_id: body.userId ?? null,

ft_utm_source: body.utm?.source ?? null,
ft_utm_medium: body.utm?.medium ?? null,
ft_utm_campaign: body.utm?.campaign ?? null,
ft_utm_content: body.utm?.content ?? null,
ft_utm_term: body.utm?.term ?? null,
ft_landing_path: body.landingPath ?? null,
ft_referrer: body.referrer ?? null,

lt_utm_source: body.lastTouch?.source ?? null,
lt_utm_medium: body.lastTouch?.medium ?? null,
lt_utm_campaign: body.lastTouch?.campaign ?? null,
lt_utm_content: body.lastTouch?.content ?? null,
lt_utm_term: body.lastTouch?.term ?? null,
lt_landing_path: body.lastTouch?.landingPath ?? null,
lt_referrer: body.lastTouch?.referrer ?? null,
};

const { data, error } = await supabase
.from("purchase_intents")
.insert(insertPayload)
.select("id, status, amount_usdc_atomic, treasury_address, usdc_mint, reference_pubkey, created_at")
.single();

if (error) {
return bad(error.message, 500);
}

return NextResponse.json({ ok: true, intent: data });
} catch (e: any) {
return bad(e?.message || "Unexpected server error", 500);
}
}

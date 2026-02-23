import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Keypair, PublicKey } from "@solana/web3.js";

function j(status: number, body: any) {
  return NextResponse.json(body, { status });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

function toAtomicUSDC(amountUsdc: number): number {
  // USDC = 6 decimals
  return Math.round(amountUsdc * 1_000_000);
}

export async function POST(req: NextRequest) {
  try {
    // 1) Validate auth
    const auth = req.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const accessToken = m?.[1]?.trim();

    if (!accessToken) {
      return j(401, { ok: false, error: "Missing Authorization Bearer token" });
    }

    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return j(401, { ok: false, error: "Invalid/expired auth token" });
    }
    const userId = userData.user.id;

    // 2) Parse payload (support both human + atomic)
    const body = await req.json().catch(() => ({} as any));

    const amountAtomic =
      body.amount_usdc_atomic != null
        ? Number(body.amount_usdc_atomic)
        : body.amountUsdc != null
          ? toAtomicUSDC(Number(body.amountUsdc))
          : NaN;

    if (!Number.isFinite(amountAtomic) || amountAtomic <= 0) {
      return j(400, { ok: false, error: "amount_usdc_atomic must be a positive number" });
    }

    const ftRefCode =
      body.ft_ref_code != null ? String(body.ft_ref_code) :
      body.refCode != null ? String(body.refCode) :
      null;

    // 3) reference_pubkey:
    // - if provided, validate it
    // - else generate a new Solana pubkey
    let referencePubkey: string;
    if (body.reference_pubkey) {
      referencePubkey = String(body.reference_pubkey);
      try {
        new PublicKey(referencePubkey);
      } catch {
        return j(400, { ok: false, error: "reference_pubkey must be a valid Solana public key" });
      }
    } else {
      referencePubkey = Keypair.generate().publicKey.toBase58();
    }

    // 4) Create intent via RPC (active tranche + user binding)
    const { data, error } = await supabaseAdmin.rpc("create_purchase_intent_with_tranche", {
      p_amount_usdc_atomic: amountAtomic,
      p_reference_pubkey: referencePubkey,
      p_ft_ref_code: ftRefCode,
      p_user_id: userId,
    });

    if (error) {
      return j(500, { ok: false, error: error.message });
    }

    const row = Array.isArray(data) ? data[0] : data;
    return j(200, { ok: true, intent: row, reference_pubkey: referencePubkey });
  } catch (e: any) {
    return j(500, { ok: false, error: e?.message || "Unexpected server error" });
  }
}

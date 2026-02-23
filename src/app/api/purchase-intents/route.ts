import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Keypair } from "@solana/web3.js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// USDC is 6 decimals on Solana
const USDC_DECIMALS = 6n;

function toAtomic(usdc: number): bigint {
  // Convert like 10.25 -> 10250000 (atomic)
  // Avoid float weirdness by rounding to 6 decimals first.
  const fixed = usdc.toFixed(Number(USDC_DECIMALS));
  const [whole, frac = ""] = fixed.split(".");
  const fracPadded = (frac + "0".repeat(Number(USDC_DECIMALS))).slice(
    0,
    Number(USDC_DECIMALS)
  );
  return BigInt(whole) * 10n ** USDC_DECIMALS + BigInt(fracPadded);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ Accept new “human” payload
    const amountUsdc = typeof body.amountUsdc === "number" ? body.amountUsdc : null;
    const refCode = typeof body.refCode === "string" ? body.refCode : null;

    // ✅ Backward compat (older payloads)
    const amount_usdc_atomic =
      typeof body.amount_usdc_atomic === "string" || typeof body.amount_usdc_atomic === "number"
        ? BigInt(body.amount_usdc_atomic)
        : null;

    const reference_pubkey =
      typeof body.reference_pubkey === "string" ? body.reference_pubkey : null;

    // --- Validate amount ---
    const atomic = amountUsdc !== null ? toAtomic(amountUsdc) : amount_usdc_atomic;

    if (atomic === null || atomic <= 0n) {
      return NextResponse.json(
        { ok: false, error: "Invalid amount. Provide amountUsdc (number) > 0." },
        { status: 400 }
      );
    }

    // --- Require user via Bearer token ---
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing Authorization Bearer token." },
        { status: 401 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Invalid auth token." },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    // --- Generate reference pubkey if missing ---
    const refPubkey = reference_pubkey ?? Keypair.generate().publicKey.toBase58();

    // --- Create intent (server chooses tranche) ---
    const { data, error } = await supabase.rpc("create_purchase_intent_with_tranche", {
      p_user_id: userId,
      p_amount_usdc_atomic: atomic.toString(),
      p_reference_pubkey: refPubkey,
      p_ft_ref_code: refCode, // ok if null
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, intent: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

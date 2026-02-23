import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Keypair } from "@solana/web3.js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// USDC is 6 decimals on Solana
const USDC_DECIMALS = 6;

function toAtomic(usdc: number): bigint {
  const fixed = usdc.toFixed(USDC_DECIMALS);
  const [whole, frac = ""] = fixed.split(".");
  const fracPadded = (frac + "0".repeat(Number(USDC_DECIMALS))).slice(0, Number(USDC_DECIMALS));
  return BigInt(whole) * 10n ** BigInt(USDC_DECIMALS) + BigInt(fracPadded);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const amountUsdc = typeof body.amountUsdc === "number" ? body.amountUsdc : null;
    const refCode = typeof body.refCode === "string" ? body.refCode : null;

    const amount_usdc_atomic =
      typeof body.amount_usdc_atomic === "string" || typeof body.amount_usdc_atomic === "number"
        ? BigInt(body.amount_usdc_atomic)
        : null;

    const reference_pubkey =
      typeof body.reference_pubkey === "string" ? body.reference_pubkey : null;

    const atomic = amountUsdc !== null ? toAtomic(amountUsdc) : amount_usdc_atomic;

    if (atomic === null || atomic <= 0n) {
      return NextResponse.json(
        { ok: false, error: "Invalid amount. Provide amountUsdc (number) > 0." },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ ok: false, error: "Invalid auth token." }, { status: 401 });
    }

    const userId = userData.user.id;

    // ✅ Rate limit: max 10 intents per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countErr } = await supabase
      .from("purchase_intents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo);

    if (countErr) {
      return NextResponse.json(
        { ok: false, error: "Rate limit check failed", details: countErr.message },
        { status: 500 }
      );
    }

    if ((count ?? 0) >= 10) {
      return NextResponse.json(
        { ok: false, error: "Too many purchase attempts. Please wait and try again." },
        { status: 429 }
      );
    }

    const refPubkey = reference_pubkey ?? Keypair.generate().publicKey.toBase58();

    // Create intent via RPC
    const { data, error } = await supabase.rpc("create_purchase_intent_with_tranche", {
      p_user_id: userId,
      p_amount_usdc_atomic: atomic.toString(),
      p_reference_pubkey: refPubkey,
      p_ft_ref_code: refCode,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, details: error },
        { status: 500 }
      );
    }

    // Move to awaiting_payment immediately
    const intentId = data?.id;
    if (intentId) {
      await supabase
        .from("purchase_intents")
        .update({ status: "awaiting_payment", updated_at: new Date().toISOString() })
        .eq("id", intentId);
    }

    return NextResponse.json({ ok: true, intent: data, reference_pubkey: refPubkey });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

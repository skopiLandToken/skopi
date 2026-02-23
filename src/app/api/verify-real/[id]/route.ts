import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Connection, PublicKey } from "@solana/web3.js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TREASURY = process.env.NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS || "";
const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || "";

const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL || "";
const VERIFY_REAL_CAN_CONFIRM =
  (process.env.VERIFY_REAL_CAN_CONFIRM || "").toLowerCase() === "true";

function atomicToUi(atomic: bigint) {
  const s = atomic.toString().padStart(7, "0");
  const whole = s.slice(0, -6);
  const frac = s.slice(-6);
  return Number(`${whole}.${frac}`);
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (!TREASURY || !USDC_MINT) {
      return NextResponse.json(
        { ok: false, error: "Missing NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS or NEXT_PUBLIC_USDC_MINT" },
        { status: 500 }
      );
    }
    if (!HELIUS_RPC_URL) {
      return NextResponse.json(
        { ok: false, error: "Missing HELIUS_RPC_URL (set in Vercel env vars)" },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: intent, error } = await supabase
      .from("purchase_intents")
      .select("id,status,amount_usdc_atomic,reference_pubkey,created_at,confirmed_at,tx_signature")
      .eq("id", params.id)
      .single();

    if (error || !intent) {
      return NextResponse.json({ ok: false, error: "Intent not found" }, { status: 404 });
    }

    if (intent.status === "confirmed") {
      return NextResponse.json({
        ok: true,
        implemented: true,
        found: true,
        message: "Intent already confirmed.",
        signature: intent.tx_signature || null,
      });
    }

    const amountAtomic = BigInt(intent.amount_usdc_atomic ?? 0);
    const amountUi = atomicToUi(amountAtomic);
    const reference = String(intent.reference_pubkey || "").trim();

    if (!reference) {
      return NextResponse.json({ ok: false, error: "Intent missing reference_pubkey" }, { status: 500 });
    }

    const conn = new Connection(HELIUS_RPC_URL, "confirmed");

    const treasuryPk = new PublicKey(TREASURY);
    const sigs = await conn.getSignaturesForAddress(treasuryPk, { limit: 75 });

    if (!sigs.length) {
      return NextResponse.json({
        ok: true,
        implemented: true,
        found: false,
        message: "No recent transactions found for treasury address (limit 75).",
      });
    }

    const usdcMint = new PublicKey(USDC_MINT).toBase58();

    for (const s of sigs) {
      const sig = s.signature;
      if (!sig) continue;

      const tx = await conn.getParsedTransaction(sig, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });

      if (!tx?.transaction?.message) continue;

      // ✅ Bulletproof reference check: reference must be in account keys
      const accountKeys =
        (tx.transaction.message.accountKeys || []).map((k: any) =>
          (k.pubkey?.toBase58?.() ?? k.toBase58?.())
        );

      const hasReference = accountKeys.includes(reference);
      if (!hasReference) continue;

      // Confirm treasury is involved too (should be, since we scanned treasury sigs)
      const touchesTreasury = accountKeys.includes(TREASURY);
      if (!touchesTreasury) continue;

      // Look for USDC transfer instruction with matching amount
      const instructions = tx.transaction.message.instructions as any[];

      let matchedTransfer = false;

      for (const ix of instructions) {
        const parsed = ix?.parsed;
        const program = ix?.program;
        if (program !== "spl-token" || !parsed) continue;
        if (parsed?.type !== "transferChecked" && parsed?.type !== "transfer") continue;

        const info = parsed.info || {};
        const mint = info.mint;

        // transferChecked has mint; transfer may not
        if (mint && mint !== usdcMint) continue;

        const amount = info.tokenAmount?.uiAmount ?? Number(info.amount ?? 0);
        if (Number(amount) !== Number(amountUi)) continue;

        matchedTransfer = true;
        break;
      }

      if (!matchedTransfer) continue;

      // ✅ We found a match: amount + treasury + reference account included
      if (!VERIFY_REAL_CAN_CONFIRM) {
        return NextResponse.json({
          ok: true,
          implemented: true,
          found: true,
          signature: sig,
          message:
            "Match found (amount + treasury + reference). Set VERIFY_REAL_CAN_CONFIRM=true to auto-confirm + commit commissions.",
        });
      }

      // Auto-confirm
      const { data: updated, error: updErr } = await supabase
        .from("purchase_intents")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
          tx_signature: sig,
          updated_at: new Date().toISOString(),
          failure_reason: null,
        })
        .eq("id", intent.id)
        .select("id,status,confirmed_at,tx_signature")
        .single();

      if (updErr) {
        return NextResponse.json({
          ok: true,
          implemented: true,
          found: true,
          signature: sig,
          confirm_ok: false,
          confirm_error: updErr.message,
        });
      }

      const { error: comErr } = await supabase.rpc("commit_affiliate_commissions", {
        p_intent_id: intent.id,
      });

      return NextResponse.json({
        ok: true,
        implemented: true,
        found: true,
        signature: sig,
        confirm_ok: true,
        commissions_ok: !comErr,
        commissions_error: comErr?.message || null,
        intent: updated,
      });
    }

    return NextResponse.json({
      ok: true,
      implemented: true,
      found: false,
      message:
        "No matching transaction found in recent treasury activity that includes the reference pubkey. (This is expected until your wallet send flow attaches the reference as an extra account.)",
      hint:
        "When you build the wallet payment step, ensure the transaction includes the reference pubkey as an additional account key (Solana Pay reference pattern).",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

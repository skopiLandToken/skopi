import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Connection, PublicKey } from "@solana/web3.js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TREASURY = process.env.NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS || "";
const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || "";

const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL || "";
const VERIFY_REAL_CAN_CONFIRM = (process.env.VERIFY_REAL_CAN_CONFIRM || "").toLowerCase() === "true";

function atomicToUi(atomic: bigint) {
  const s = atomic.toString().padStart(7, "0");
  const whole = s.slice(0, -6);
  const frac = s.slice(-6);
  return Number(`${whole}.${frac}`);
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
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

    const amountAtomic = BigInt(intent.amount_usdc_atomic ?? 0);
    const amountUi = atomicToUi(amountAtomic);
    const ref = intent.reference_pubkey as string;

    const conn = new Connection(HELIUS_RPC_URL, "confirmed");

    // Scan recent transactions involving TREASURY
    const treasuryPk = new PublicKey(TREASURY);
    const sigs = await conn.getSignaturesForAddress(treasuryPk, { limit: 50 });

    if (!sigs.length) {
      return NextResponse.json({
        ok: true,
        implemented: true,
        found: false,
        message: "No recent transactions found for treasury address (limit 50).",
      });
    }

    const usdcMint = new PublicKey(USDC_MINT).toBase58();

    // Look for a parsed USDC transfer to treasury matching amount
    for (const s of sigs) {
      if (!s.signature) continue;

      const tx = await conn.getParsedTransaction(s.signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });

      if (!tx?.meta) continue;

      // Check all parsed instructions for token transfers
      const instructions = tx.transaction.message.instructions as any[];

      for (const ix of instructions) {
        const parsed = ix?.parsed;
        const program = ix?.program;

        if (program !== "spl-token" || !parsed) continue;
        if (parsed?.type !== "transferChecked" && parsed?.type !== "transfer") continue;

        const info = parsed.info || {};
        const mint = info.mint;

        // transferChecked includes mint; transfer might not
        if (mint && mint !== usdcMint) continue;

        const dest = info.destination;
        const amount = info.tokenAmount?.uiAmount ?? Number(info.amount ?? 0);

        // Destination might be token account not treasury wallet.
        // BUT token transfers to treasury typically go to treasury's token account.
        // We'll accept if any accountKeys include treasury AND amount matches.
        const accountKeys = tx.transaction.message.accountKeys?.map((k: any) => k.pubkey?.toBase58?.() ?? k.toBase58?.()) ?? [];
        const touchesTreasury = accountKeys.includes(TREASURY);

        if (!touchesTreasury) continue;
        if (Number(amount) !== Number(amountUi)) continue;

        // Optional: attempt to detect the reference key in memo/logs (depends on how you attach it)
        // For now, just return the matching signature.
        const foundSig = s.signature;

        // Confirm + commit commissions only if enabled
        if (VERIFY_REAL_CAN_CONFIRM) {
          const { data: updated, error: updErr } = await supabase
            .from("purchase_intents")
            .update({
              status: "confirmed",
              confirmed_at: new Date().toISOString(),
              tx_signature: foundSig,
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
              signature: foundSig,
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
            signature: foundSig,
            confirm_ok: true,
            commissions_ok: !comErr,
            commissions_error: comErr?.message || null,
            intent: updated,
          });
        }

        return NextResponse.json({
          ok: true,
          implemented: true,
          found: true,
          signature: foundSig,
          message:
            "Match found (amount + treasury involvement). Set VERIFY_REAL_CAN_CONFIRM=true to auto-confirm + commit commissions.",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      implemented: true,
      found: false,
      message:
        "No matching USDC transfer found in the last 50 treasury transactions. Increase scan limit or refine matching later.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

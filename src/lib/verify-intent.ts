import { Connection, PublicKey } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";

/**
 * NOTE:
 * - This file verifies on-chain USDC transfers for a purchase_intent.
 * - When an intent becomes confirmed, it now auto-commits affiliate commissions via:
 *   public.commit_affiliate_commissions(p_intent_id uuid)
 * - The DB function is idempotent (unique(intent_id, level)), so retries are safe.
 */

type IntentRow = {
  id: string;
  status: string;
  amount_usdc_atomic: number;
  treasury_address: string;
  usdc_mint: string;
  reference_pubkey: string;
  tx_signature?: string | null;
};

type VerifyResult =
  | { ok: true; matched: false; reason: string }
  | { ok: true; matched: true; intent: any }
  | { ok: false; error: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Use your existing RPC env (this is typically already in .env.local / Vercel env vars)
const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  process.env.SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

const connection = new Connection(RPC_URL, "confirmed");

export async function verifyIntentById(id: string): Promise<VerifyResult> {
  const { data: intent, error } = await supabase
    .from("purchase_intents")
    .select("id,status,amount_usdc_atomic,treasury_address,usdc_mint,reference_pubkey,tx_signature,confirmed_at")
    .eq("id", id)
    .single();

  if (error) return { ok: false as const, error: error.message };
  if (!intent) return { ok: false as const, error: "Intent not found" };

  return verifyIntentObject(intent as IntentRow);
}

export async function verifyIntentObject(intent: IntentRow): Promise<VerifyResult> {
  // If already confirmed, no need to scan chain again.
  if (intent.status === "confirmed") {
    // Still safe to attempt commission commit (idempotent), but we can skip.
    return { ok: true as const, matched: true as const, intent };
  }

  const treasury = intent.treasury_address;
  const usdcMint = intent.usdc_mint;
  const expectedAtomic = Number(intent.amount_usdc_atomic);

  if (!treasury || !usdcMint || !expectedAtomic || expectedAtomic <= 0) {
    return { ok: false as const, error: "Intent missing treasury/usdc_mint/amount" };
  }

  // We scan recent signatures for the reference pubkey (your intent reference address)
  const reference = new PublicKey(intent.reference_pubkey);
  const sigs = await connection.getSignaturesForAddress(reference, { limit: 20 });

  let matchedSignature: string | null = null;

  for (const sigInfo of sigs) {
    if (sigInfo.err) continue;

    const tx = await connection.getParsedTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (!tx?.meta) continue;

    // Parsed token balances can be checked for mint/destination/amount match
    const postTokenBalances = tx.meta.postTokenBalances || [];
    const preTokenBalances = tx.meta.preTokenBalances || [];

    // Match by mint + destination + exact amount delta.
    // We look for a token account whose owner is treasury and mint is USDC,
    // with token amount delta matching expectedAtomic.
    let mintMatched = false;
    let destMatched = false;
    let amountMatched = false;

    for (let i = 0; i < postTokenBalances.length; i++) {
      const post = postTokenBalances[i];
      const pre = preTokenBalances.find((p) => p.accountIndex === post.accountIndex);

      if (!post?.mint) continue;
      if (post.mint !== usdcMint) continue;

      mintMatched = true;

      const postAmount = Number(post.uiTokenAmount.amount);
      const preAmount = pre ? Number(pre.uiTokenAmount.amount) : 0;
      const delta = postAmount - preAmount;

      // Owner is sometimes present; if not, we fallback to destination check by parsing instructions.
      const owner = (post as any).owner as string | undefined;
      if (owner && owner === treasury) destMatched = true;

      if (delta === expectedAtomic) amountMatched = true;
    }

    // Fallback destination matching: parse instructions for a USDC transfer to treasury
    if (mintMatched && amountMatched && !destMatched) {
      try {
        const ix = tx.transaction.message.instructions as any[];
        for (const ins of ix) {
          const parsed = ins?.parsed;
          if (!parsed) continue;
          if (parsed?.type !== "transferChecked" && parsed?.type !== "transfer") continue;

          const info = parsed?.info;
          if (!info) continue;

          const dest = info?.destination || info?.dest;
          const mint = info?.mint;

          // Amount might be string; for transferChecked it can be "tokenAmount"
          const amtStr = info?.amount || info?.tokenAmount?.amount;

          if (mint && mint !== usdcMint) continue;
          if (dest && dest === treasury) destMatched = true;

          if (amtStr != null) {
            const amt = Number(amtStr);
            if (amt === expectedAtomic) amountMatched = true;
          }
        }
      } catch {
        // ignore fallback parsing failures
      }
    }

    if (amountMatched && destMatched && mintMatched) {
      matchedSignature = sigInfo.signature;
      break;
    }
  }

  if (!matchedSignature) {
    await supabase
      .from("purchase_intents")
      .update({ failure_reason: "No exact matching confirmed transfer found yet" })
      .eq("id", intent.id);

    return {
      ok: true as const,
      matched: false as const,
      reason: "No exact matching transfer yet",
    };
  }

  const { data: updated, error: updateErr } = await supabase
    .from("purchase_intents")
    .update({
      status: "confirmed",
      tx_signature: matchedSignature,
      confirmed_at: new Date().toISOString(),
      failure_reason: null,
    })
    .eq("id", intent.id)
    .select("id,status,tx_signature,confirmed_at,updated_at")
    .single();

  if (updateErr) {
    return { ok: false as const, error: updateErr.message };
  }

  // ✅ Auto-commit affiliate commissions after confirmation (idempotent)
  try {
    const { error: rpcErr } = await supabase.rpc("commit_affiliate_commissions", {
      p_intent_id: intent.id,
    });
    if (rpcErr) {
      console.error("commit_affiliate_commissions failed:", rpcErr.message);
    }
  } catch (e) {
    console.error("commit_affiliate_commissions threw:", e);
  }

  return { ok: true as const, matched: true as const, intent: updated };
}

export async function listCreatedIntents(limit = 25) {
  const { data, error } = await supabase
    .from("purchase_intents")
    .select("id,status,amount_usdc_atomic,treasury_address,usdc_mint,reference_pubkey,tx_signature")
    .eq("status", "created")
    .order("created_at", { ascending: true })
    .limit(limit);

  return { data: (data || []) as IntentRow[], error };
}

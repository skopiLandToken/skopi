import { Connection, PublicKey } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";

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
  if (intent.status === "confirmed") {
    return { ok: true as const, matched: true as const, intent };
  }

  const treasury = intent.treasury_address;
  const usdcMint = intent.usdc_mint;
  const expectedAtomic = Number(intent.amount_usdc_atomic);

  if (!treasury || !usdcMint || !expectedAtomic || expectedAtomic <= 0) {
    return { ok: false as const, error: "Intent missing treasury/usdc_mint/amount" };
  }

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

    const postTokenBalances = tx.meta.postTokenBalances || [];
    const preTokenBalances = tx.meta.preTokenBalances || [];

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

      const owner = (post as any).owner as string | undefined;
      if (owner && owner === treasury) destMatched = true;

      if (delta === expectedAtomic) amountMatched = true;
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

    return { ok: true as const, matched: false as const, reason: "No exact matching transfer yet" };
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
    .select("id,status,tx_signature,confirmed_at,updated_at,tranche_id,tokens_skopi,price_usdc_used")
    .single();

  if (updateErr) {
    return { ok: false as const, error: updateErr.message };
  }

  // 1) Commit affiliate commissions (idempotent)
  try {
    const { error: rpcErr } = await supabase.rpc("commit_affiliate_commissions", {
      p_intent_id: intent.id,
    });
    if (rpcErr) console.error("commit_affiliate_commissions failed:", rpcErr.message);
  } catch (e) {
    console.error("commit_affiliate_commissions threw:", e);
  }

  // 2) Decrement tranche remaining (idempotent-ish via confirmed gate + update condition)
  try {
    const { error: tErr } = await supabase.rpc("finalize_tranche_on_confirm", {
      p_intent_id: intent.id,
    });
    if (tErr) console.error("finalize_tranche_on_confirm failed:", tErr.message);
  } catch (e) {
    console.error("finalize_tranche_on_confirm threw:", e);
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

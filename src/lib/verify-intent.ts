import { createClient } from "@supabase/supabase-js";
import {
  Connection,
  PublicKey,
  ParsedInstruction,
  PartiallyDecodedInstruction,
} from "@solana/web3.js";

type IntentRow = {
  id: string;
  status: string;
  amount_usdc_atomic: number;
  treasury_address: string;
  usdc_mint: string;
  reference_pubkey: string;
  tx_signature?: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

const supabase = createClient(supabaseUrl, serviceRoleKey);
const connection = new Connection(rpcUrl, "confirmed");

function isParsedInstruction(
  ix: ParsedInstruction | PartiallyDecodedInstruction
): ix is ParsedInstruction {
  return "parsed" in ix;
}

export async function getIntentById(id: string) {
  const { data, error } = await supabase
    .from("purchase_intents")
    .select("id,status,amount_usdc_atomic,treasury_address,usdc_mint,reference_pubkey,tx_signature")
    .eq("id", id)
    .single();

  return { data: data as IntentRow | null, error };
}

export async function verifyIntentById(id: string) {
  const { data: intent, error } = await getIntentById(id);
  if (error || !intent) {
    return { ok: false as const, notFound: true as const, error: error?.message || "Intent not found" };
  }

  return verifyIntentObject(intent);
}

export async function verifyIntentObject(intent: IntentRow) {
  if (intent.status === "confirmed") {
    return { ok: true as const, alreadyConfirmed: true as const, matched: true as const, intent };
  }

  const reference = new PublicKey(intent.reference_pubkey);
  const treasury = intent.treasury_address;
  const expectedAtomic = Number(intent.amount_usdc_atomic);
  const expectedMint = intent.usdc_mint;

  const sigInfos = await connection.getSignaturesForAddress(reference, { limit: 20 });

  if (!sigInfos.length) {
    await supabase
      .from("purchase_intents")
      .update({ failure_reason: "No tx found for reference yet" })
      .eq("id", intent.id);

    return {
      ok: true as const,
      matched: false as const,
      reason: "No tx found for reference yet",
    };
  }

  let matchedSignature: string | null = null;

  for (const sigInfo of sigInfos) {
    const tx = await connection.getParsedTransaction(sigInfo.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx?.transaction?.message?.instructions) continue;

    let amountMatched = false;
    let destMatched = false;
    let mintMatched = false;

    for (const ix of tx.transaction.message.instructions) {
      if (!isParsedInstruction(ix)) continue;
      if (ix.program !== "spl-token") continue;

      const parsed = ix.parsed as any;
      const info = parsed?.info;

      if (parsed?.type === "transferChecked" && info) {
        const dest = info.destination;
        const mint = info.mint;
        const tokenAmount = Number(info.tokenAmount?.amount ?? 0);

        if (dest === treasury) destMatched = true;
        if (mint === expectedMint) mintMatched = true;
        if (tokenAmount === expectedAtomic) amountMatched = true;
      }

      if (parsed?.type === "transfer" && info) {
        const dest = info.destination;
        const tokenAmount = Number(info.amount ?? 0);
        if (dest === treasury) destMatched = true;
        if (tokenAmount === expectedAtomic) amountMatched = true;
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

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  Connection,
  PublicKey,
  ParsedInstruction,
  PartiallyDecodedInstruction,
} from "@solana/web3.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const rpcUrl =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

const supabase = createClient(supabaseUrl, serviceRoleKey);

function isParsedInstruction(
  ix: ParsedInstruction | PartiallyDecodedInstruction
): ix is ParsedInstruction {
  return "parsed" in ix;
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing intent id" }, { status: 400 });
    }

    const { data: intent, error: intentErr } = await supabase
      .from("purchase_intents")
      .select("*")
      .eq("id", id)
      .single();

    if (intentErr || !intent) {
      return NextResponse.json({ ok: false, error: "Intent not found" }, { status: 404 });
    }

    if (intent.status === "confirmed") {
      return NextResponse.json({ ok: true, alreadyConfirmed: true, intent });
    }

    const reference = new PublicKey(intent.reference_pubkey);
    const treasury = intent.treasury_address;
    const expectedAtomic = Number(intent.amount_usdc_atomic);
    const expectedMint = intent.usdc_mint;

    const connection = new Connection(rpcUrl, "confirmed");
    const sigInfos = await connection.getSignaturesForAddress(reference, { limit: 20 });

    if (!sigInfos.length) {
      return NextResponse.json({ ok: true, matched: false, reason: "No tx found for reference yet" });
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

        // transferChecked is preferred
        if (parsed?.type === "transferChecked" && info) {
          const dest = info.destination;
          const mint = info.mint;
          const tokenAmount = Number(info.tokenAmount?.amount ?? 0);

          if (dest === treasury) destMatched = true;
          if (mint === expectedMint) mintMatched = true;
          if (tokenAmount === expectedAtomic) amountMatched = true;
        }

        // fallback transfer (less metadata)
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
        .eq("id", id);

      return NextResponse.json({
        ok: true,
        matched: false,
        reason: "No exact matching transfer yet",
      });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("purchase_intents")
      .update({
        status: "confirmed",
        tx_signature: matchedSignature,
        confirmed_at: new Date().toISOString(),
        failure_reason: null,
      })
      .eq("id", id)
      .select("id,status,tx_signature,confirmed_at,updated_at")
      .single();

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, matched: true, intent: updated });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected verifier error" },
      { status: 500 }
    );
  }
}

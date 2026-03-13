import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import nacl from "tweetnacl";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RPC_URL =
  process.env.HELIUS_RPC_URL ||
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

const connection = new Connection(RPC_URL, "confirmed");

function parseKeypairFromEnv(): Keypair {
  const raw = process.env.SKOPI_DISTRIBUTION_KEYPAIR;
  if (!raw) throw new Error("Missing SKOPI_DISTRIBUTION_KEYPAIR env var");
  const arr = JSON.parse(raw);
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const p = await context.params;
    const id = String(p?.id || "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "Missing intent id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const wallet = String(body?.wallet || "").trim();
    const signatureB64 = String(body?.signature || "").trim();

    if (!wallet || !signatureB64) {
      return NextResponse.json({ ok: false, error: "Missing wallet/signature" }, { status: 400 });
    }

    const { data: intent, error } = await supabase
      .from("purchase_intents")
      .select("id,status,tokens_skopi,payer_pubkey,skopi_claimed_at")
      .eq("id", id)
      .single();

    if (error || !intent) return NextResponse.json({ ok: false, error: "Intent not found" }, { status: 404 });
    if (intent.status !== "confirmed") return NextResponse.json({ ok: false, error: "Not confirmed yet" }, { status: 400 });
    if (intent.skopi_claimed_at) return NextResponse.json({ ok: true, alreadyClaimed: true }, { status: 200 });

    if (!intent.payer_pubkey) {
      return NextResponse.json({ ok: false, error: "Missing payer_pubkey (pay again or contact support)" }, { status: 400 });
    }

    if (wallet !== intent.payer_pubkey) {
      return NextResponse.json({ ok: false, error: "Wallet does not match payer" }, { status: 403 });
    }

    const message = `CLAIM_SKOPI intent=${id} wallet=${wallet}`;
    const msgBytes = new TextEncoder().encode(message);

    const sigBytes = Uint8Array.from(Buffer.from(signatureB64, "base64"));
    const pubkey = new PublicKey(wallet);

    const ok = nacl.sign.detached.verify(msgBytes, sigBytes, pubkey.toBytes());
    if (!ok) return NextResponse.json({ ok: false, error: "Bad signature" }, { status: 403 });

    const mint = new PublicKey(process.env.SKOPI_MINT!);
    const decimals = Number(process.env.SKOPI_DECIMALS || "9");
    const distro = parseKeypairFromEnv();

    const buyerAta = await getAssociatedTokenAddress(mint, pubkey);
    const distroAta = await getAssociatedTokenAddress(mint, distro.publicKey);

    const tx = new Transaction();

    // Ensure buyer ATA exists
    const buyerInfo = await connection.getAccountInfo(buyerAta);
    if (!buyerInfo) {
      tx.add(createAssociatedTokenAccountInstruction(distro.publicKey, buyerAta, pubkey, mint));
    }

    const amount = BigInt(intent.tokens_skopi) * BigInt(10) ** BigInt(decimals);

    tx.add(
      createTransferCheckedInstruction(
        distroAta,
        mint,
        buyerAta,
        distro.publicKey,
        amount,
        decimals
      )
    );

    const sig = await connection.sendTransaction(tx, [distro], { skipPreflight: false });
    await connection.confirmTransaction(sig, "confirmed");

    await supabase
      .from("purchase_intents")
      .update({ skopi_claimed_at: new Date().toISOString(), skopi_tx_signature: sig })
      .eq("id", id);

    return NextResponse.json({ ok: true, claimed: true, tx: sig }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}

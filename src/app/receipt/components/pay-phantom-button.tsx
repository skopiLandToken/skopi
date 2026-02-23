"use client";

import { useState } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
} from "@solana/spl-token";

type PhantomProvider = {
  isPhantom?: boolean;
  connect: (opts?: any) => Promise<{ publicKey: PublicKey }>;
  publicKey?: PublicKey;
  signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }>;
};

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

function atomicToUiAmount(atomic: string | number) {
  // USDC 6 decimals
  const a = BigInt(atomic as any);
  const s = a.toString().padStart(7, "0");
  const whole = s.slice(0, -6);
  const frac = s.slice(-6);
  return Number(`${whole}.${frac}`);
}

export default function PayPhantomButton(props: {
  intentId: string;
  amountUsdcAtomic: string;
  referencePubkey: string;
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sig, setSig] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    setSig(null);

    try {
      const treasury = process.env.NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS || "";
      const usdcMint = process.env.NEXT_PUBLIC_USDC_MINT || "";
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || process.env.HELIUS_RPC_URL || "";

      if (!treasury || !usdcMint) {
        setMsg("Missing NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS or NEXT_PUBLIC_USDC_MINT");
        setLoading(false);
        return;
      }
      if (!rpcUrl) {
        setMsg("Missing NEXT_PUBLIC_SOLANA_RPC_URL (or HELIUS_RPC_URL) env var");
        setLoading(false);
        return;
      }

      const provider = window.solana;
      if (!provider?.isPhantom) {
        setMsg("Phantom not found. Install Phantom wallet.");
        setLoading(false);
        return;
      }

      const { publicKey } = await provider.connect();
      const payer = publicKey;

      const connection = new Connection(rpcUrl, "confirmed");

      const mint = new PublicKey(usdcMint);
      const treasuryPk = new PublicKey(treasury);
      const reference = new PublicKey(props.referencePubkey);

      const fromAta = await getAssociatedTokenAddress(mint, payer);
      const toAta = await getAssociatedTokenAddress(mint, treasuryPk);

      const amountAtomic = BigInt(props.amountUsdcAtomic);
      const amountUi = atomicToUiAmount(props.amountUsdcAtomic);

      // TransferChecked uses decimals=6 for USDC
      const ix = createTransferCheckedInstruction(
        fromAta,
        mint,
        toAta,
        payer,
        amountAtomic,
        6
      );

      // ✅ Solana Pay reference pattern:
      // Add reference as a readonly account key on the instruction.
      ix.keys.push({ pubkey: reference, isSigner: false, isWritable: false });

      const tx = new Transaction().add(ix);
      tx.feePayer = payer;
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;

      setMsg(`Sending ${amountUi} USDC…`);
      const sent = await provider.signAndSendTransaction(tx);
      setSig(sent.signature);
      setMsg("Sent ✅ Now verifying…");

      const res = await fetch(`/api/verify-real/${props.intentId}`, { method: "POST" });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setMsg(json?.error || "Verify-real failed");
        setLoading(false);
        return;
      }

      setMsg(json?.found ? "Verified ✅" : (json?.message || "Not found yet — try again in a moment"));
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <button
        onClick={run}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #111",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Working…" : "Pay with Phantom (USDC)"}
      </button>

      {sig ? (
        <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.85, wordBreak: "break-all" }}>
          tx: {sig}
        </div>
      ) : null}

      {msg ? (
        <div style={{ fontSize: 13, opacity: 0.9 }}>{msg}</div>
      ) : null}
    </div>
  );
}

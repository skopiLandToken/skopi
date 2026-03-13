from pathlib import Path

TARGET = Path("src/app/receipt/components/pay-phantom-button.tsx")

TSX = r""""use client";

import { useState } from "react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferCheckedInstruction } from "@solana/spl-token";

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
  const a = BigInt(atomic as any);
  const s = a.toString().padStart(7, "0");
  const whole = s.slice(0, -6);
  const frac = s.slice(-6);
  return Number(`${whole}.${frac}`);
}

function stringifySimError(err: any) {
  try {
    if (!err) return "Unknown simulation error";
    if (typeof err === "string") return err;
    if (err?.InstructionError) return JSON.stringify(err.InstructionError);
    return JSON.stringify(err);
  } catch {
    return "Unknown simulation error";
  }
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
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "";

      if (!treasury || !usdcMint) {
        setMsg("ERROR: Missing NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS or NEXT_PUBLIC_USDC_MINT");
        return;
      }
      if (!rpcUrl) {
        setMsg("ERROR: Missing NEXT_PUBLIC_SOLANA_RPC_URL env var");
        return;
      }

      const provider = window.solana;
      if (!provider?.isPhantom) {
        setMsg("ERROR: Phantom not found. Install Phantom wallet.");
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

      const ix = createTransferCheckedInstruction(fromAta, mint, toAta, payer, amountAtomic, 6);

      // Attach reference as readonly account key (Solana Pay reference pattern)
      ix.keys.push({ pubkey: reference, isSigner: false, isWritable: false });

      const tx = new Transaction().add(ix);
      tx.feePayer = payer;

      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;

      // === Preflight simulation (legacy Transaction overload) ===
      setMsg("Preflight simulation…");
      const sim = await connection.simulateTransaction(tx);

      if (sim.value.err) {
        const logs = sim.value.logs || [];
        const lastLog = logs.slice(-1)[0] || "";
        const errStr = stringifySimError(sim.value.err);

        setMsg(
          "ERROR: Transaction simulation failed.\n" +
            f"Reason: {errStr}\n" +
            (lastLog ? f"Last log: {lastLog}\n" : "") +
            "Common causes: no USDC balance, missing USDC token account, or RPC issues."
        );
        return;
      }

      // === If simulation passes, ask Phantom to sign & send ===
      setMsg(`Sending ${amountUi} USDC…`);
      const sent = await provider.signAndSendTransaction(tx);
      setSig(sent.signature);

      // Auto verify with retries
      for (let attempt = 1; attempt <= 3; attempt++) {
        setMsg(`Verifying… (try ${attempt}/3)`);
        const res = await fetch(`/api/verify-real/${props.intentId}`, { method: "POST" });
        const json = await res.json().catch(() => ({}));

        if (res.ok && json?.ok && json?.found) {
          setMsg("Verified ✅ Refreshing…");
          setTimeout(() => window.location.reload(), 800);
          return;
        }

        const lastMsg = json?.message || json?.error || "Not found yet — try again in a moment";
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 2000));
          setMsg(lastMsg);
        } else {
          setMsg(lastMsg);
        }
      }
    } catch (e: any) {
      setMsg(`ERROR: ${e?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  const isError = !!msg && msg.startsWith("ERROR:");

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <button
        onClick={run}
        disabled={loading}
        style={{
          padding: "12px 16px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.18)",
          background: loading
            ? "rgba(255,255,255,0.08)"
            : "linear-gradient(90deg, rgba(0, 180, 255, 0.95), rgba(0, 255, 200, 0.90))",
          color: loading ? "rgba(255,255,255,0.75)" : "#031015",
          fontWeight: 900,
          letterSpacing: 0.2,
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: loading ? "none" : "0 10px 28px rgba(0, 220, 255, 0.18)",
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
        isError ? (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,80,80,0.70)",
              background: "rgba(255,80,80,0.10)",
              color: "rgba(255,220,220,0.98)",
              fontWeight: 800,
              whiteSpace: "pre-wrap",
              fontSize: 13,
            }}
          >
            {msg}
          </div>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.9, whiteSpace: "pre-wrap" }}>{msg}</div>
        )
      ) : null}
    </div>
  );
}
"""

def main():
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    # fix a small Python f-string artifact in TSX (we used f"..." inside the TSX string)
    fixed = TSX.replace('f"Reason: {errStr}\\n"', '`Reason: ${errStr}\\n`').replace(
        'f"Last log: {lastLog}\\n"', '`Last log: ${lastLog}\\n`'
    )
    TARGET.write_text(fixed, encoding="utf-8")
    print(f"✅ Overwrote {TARGET}")

if __name__ == "__main__":
    main()

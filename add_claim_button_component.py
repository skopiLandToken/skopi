from pathlib import Path

TARGET = Path("src/app/receipt/components/claim-skopi-button.tsx")

TSX = r"""'use client';

import { useState } from "react";

type PhantomProvider = {
  isPhantom?: boolean;
  connect: (opts?: any) => Promise<{ publicKey: { toBase58: () => string } }>;
  signMessage?: (msg: Uint8Array) => Promise<Uint8Array>;
};

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

function toBase64(u8: Uint8Array) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

export default function ClaimSkopiButton(props: { intentId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    setTx(null);

    try {
      const provider = window.solana;
      if (!provider?.isPhantom) {
        setMsg("ERROR: Phantom not found. Install Phantom wallet.");
        return;
      }

      const { publicKey } = await provider.connect();
      const wallet = publicKey.toBase58();

      if (!provider.signMessage) {
        setMsg("ERROR: Phantom signMessage not available. Enable it or update Phantom.");
        return;
      }

      const message = `CLAIM_SKOPI intent=${props.intentId} wallet=${wallet}`;
      const bytes = new TextEncoder().encode(message);

      setMsg("Signing claim request…");
      const sigBytes = await provider.signMessage(bytes);
      const signatureB64 = toBase64(sigBytes);

      setMsg("Claiming SKOPI…");
      const res = await fetch(`/api/claim-skopi/${props.intentId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet, signature: signatureB64 }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setMsg(`ERROR: ${json?.error || json?.message || "Claim failed"}`);
        return;
      }

      if (json?.alreadyClaimed) {
        setMsg("Already claimed ✅");
        setTimeout(() => window.location.reload(), 700);
        return;
      }

      if (json?.tx) setTx(String(json.tx));
      setMsg("Claimed ✅ (refreshing…)");

      setTimeout(() => window.location.reload(), 900);
    } catch (e: any) {
      setMsg(`ERROR: ${e?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  const isError = !!msg && msg.startsWith("ERROR:");

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        onClick={run}
        disabled={loading}
        style={{
          padding: "12px 16px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.18)",
          background: loading
            ? "rgba(255,255,255,0.08)"
            : "linear-gradient(90deg, rgba(255, 180, 0, 0.95), rgba(255, 90, 0, 0.90))",
          color: loading ? "rgba(255,255,255,0.75)" : "#120903",
          fontWeight: 900,
          letterSpacing: 0.2,
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: loading ? "none" : "0 10px 28px rgba(255, 140, 0, 0.18)",
        }}
      >
        {loading ? "Working…" : "Claim SKOPI"}
      </button>

      {tx ? (
        <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.85, wordBreak: "break-all" }}>
          skopi tx: {tx}
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
    TARGET.write_text(TSX, encoding="utf-8")
    print(f"✅ Wrote {TARGET}")

if __name__ == "__main__":
    main()

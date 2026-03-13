from pathlib import Path

TARGET = Path("src/app/receipt/components/verify-real-button.tsx")

TSX = r"""'use client';

import { useState } from "react";

export default function VerifyRealButton(props: { intentId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/verify-real/${props.intentId}`, { method: "POST" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setMsg(`ERROR: ${json?.error || json?.message || "Verify failed"}`);
        return;
      }

      if (json?.found) {
        setMsg("Confirmed ✅ (refreshing…)"); // now this is true because backend updates DB
        setTimeout(() => window.location.reload(), 700);
        return;
      }

      setMsg("Not found yet. Wait 10 seconds and try again.");
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
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.18)",
          background: loading ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.10)",
          color: "rgba(255,255,255,0.92)",
          fontWeight: 800,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Verifying…" : "Verify on-chain"}
      </button>

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
    print(f"✅ Overwrote {TARGET}")

if __name__ == "__main__":
    main()

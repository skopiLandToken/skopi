"use client";

import { useState } from "react";

export default function VerifyRealButton({ intentId }: { intentId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/verify-real/${intentId}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setMsg(json?.error || "Real verify failed");
        setLoading(false);
        return;
      }

      setMsg(json?.implemented ? "Verified ✅ (refreshing…)" : (json?.message || "Coming soon"));
      if (json?.implemented && json?.found) {
        setTimeout(() => window.location.reload(), 700);
      }
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid #555",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: 0.9,
      }}
      title="On-chain verification is not enabled yet (safe preview)."
    >
      {loading ? "Checking…" : "Verify on-chain (coming soon)"}
      {msg ? <span style={{ marginLeft: 10, opacity: 0.8 }}>{msg}</span> : null}
    </button>
  );
}

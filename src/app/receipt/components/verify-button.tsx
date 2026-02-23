"use client";

import { useState } from "react";

export default function VerifyButton({ intentId }: { intentId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);

    try {
      const adminToken = process.env.NEXT_PUBLIC_ADMIN_FORCE_CONFIRM_TOKEN || "";
      if (!adminToken) {
        setMsg("Missing NEXT_PUBLIC_ADMIN_FORCE_CONFIRM_TOKEN");
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/verify/${intentId}`, {
        method: "POST",
        headers: { "x-admin-token": adminToken },
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setMsg(json?.error || "Verify failed");
        setLoading(false);
        return;
      }

      setMsg("Verified ✅");
      window.location.reload();
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
        border: "1px solid #111",
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "Verifying…" : "Verify payment (test mode)"}
      {msg ? <span style={{ marginLeft: 10, opacity: 0.8 }}>{msg}</span> : null}
    </button>
  );
}

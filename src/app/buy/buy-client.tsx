"use client";

import { useEffect, useMemo, useState } from "react";

function getParam(name: string) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) || "";
}

export default function BuyClient() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const amount = useMemo(() => {
    const raw = getParam("amount");
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 10;
  }, []);

  const ref = useMemo(() => {
    return getParam("ref").trim();
  }, []);

  async function createIntent() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/purchase-intents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amountUsdc: amount,
          refCode: ref || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok || !json?.intent?.id) {
        setErr(json?.error || "Failed to create intent");
        setLoading(false);
        return;
      }

      // Redirect to receipt
      window.location.href = `/receipt/${json.intent.id}`;
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Auto-create on page load for frictionless flow
    createIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 760 }}>
      <h1 style={{ margin: 0 }}>Creating your purchase…</h1>
      <p style={{ marginTop: 8, opacity: 0.85 }}>
        Amount: <b>${amount}</b> {ref ? <>• Ref: <b style={{ fontFamily: "monospace" }}>{ref}</b></> : null}
      </p>

      {loading ? (
        <p style={{ marginTop: 16 }}>Working…</p>
      ) : null}

      {err ? (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: "1px solid #f00" }}>
          <b>Error:</b> {err}
          <div style={{ marginTop: 10 }}>
            <button
              onClick={createIntent}
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #111", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

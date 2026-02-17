"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Intent = {
  id: string;
  status: string;
  amount_usdc_atomic: number;
  treasury_address: string;
  usdc_mint: string;
  reference_pubkey: string;
  tx_signature?: string | null;
  created_at: string;
  updated_at?: string;
};

function humanUsdc(amountAtomic: number) {
  return (amountAtomic / 1_000_000).toFixed(6).replace(/\.?0+$/, "");
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const style: React.CSSProperties = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  };

  if (s === "confirmed") {
    return <span style={{ ...style, background: "#d8f8df", color: "#0f6b2a" }}>{status}</span>;
  }
  if (s === "failed" || s === "expired") {
    return <span style={{ ...style, background: "#ffe1e1", color: "#8d1d1d" }}>{status}</span>;
  }
  return <span style={{ ...style, background: "#fff1d6", color: "#8a5a00" }}>{status}</span>;
}

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/purchase-intents/${id}/status`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load receipt");
      }
      setIntent(data.intent);
    } catch (e: any) {
      setError(e?.message || "Failed to load receipt");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${label} copied`);
    } catch {
      alert(`Could not copy ${label}`);
    }
  }

  const txUrl = intent?.tx_signature ? `https://solscan.io/tx/${intent.tx_signature}` : null;

  return (
    <main style={{ maxWidth: 780, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 34, marginBottom: 8 }}>SKOpi Receipt</h1>
      <p style={{ opacity: 0.8, marginBottom: 20 }}>
        Receipt reference: <code>{id}</code>
      </p>

      {loading && <p>Loading receipt...</p>}

      {error && (
        <div style={{ border: "1px solid #f5b5b5", background: "#fff5f5", color: "#8a1c1c", borderRadius: 12, padding: 12 }}>
          {error}
        </div>
      )}

      {intent && (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fafafa" }}>
          <p style={{ marginBottom: 10 }}>
            <strong>Status:</strong> <StatusBadge status={intent.status} />
          </p>
          <p><strong>Intent ID:</strong> {intent.id}</p>
          <p><strong>Amount:</strong> {humanUsdc(intent.amount_usdc_atomic)} USDC</p>
          <p><strong>Treasury:</strong> {intent.treasury_address}</p>
          <p><strong>Reference:</strong> {intent.reference_pubkey}</p>
          <p>
            <strong>Tx Signature:</strong>{" "}
            {intent.tx_signature ? (
              <>
                <code>{intent.tx_signature}</code>{" "}
                <a href={txUrl!} target="_blank" rel="noreferrer">
                  View on Solscan
                </a>
              </>
            ) : (
              "Not confirmed yet"
            )}
          </p>
          <p><strong>Created:</strong> {new Date(intent.created_at).toLocaleString()}</p>
          {intent.updated_at && <p><strong>Updated:</strong> {new Date(intent.updated_at).toLocaleString()}</p>}

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={load} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #222", cursor: "pointer" }}>
              Refresh Status
            </button>
            <button onClick={() => copyText(intent.id, "Intent ID")}>
              Copy Intent ID
            </button>
            <button onClick={() => copyText(intent.reference_pubkey, "Reference")}>Copy Reference</button>
            {intent.tx_signature && (
              <button onClick={() => copyText(intent.tx_signature!, "Tx Signature")}>Copy Tx Signature</button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";

type Intent = {
  id: string;
  status: string;
  amount_usdc_atomic: number;
  wallet_address?: string | null;
  reference_pubkey: string;
  tx_signature?: string | null;
  ft_utm_source?: string | null;
  ft_utm_campaign?: string | null;
  created_at: string;
  updated_at?: string;
};

function humanUsdc(amountAtomic: number) {
  return (amountAtomic / 1_000_000).toFixed(2);
}

export default function AdminIntentsPage() {
  const [rows, setRows] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/intents", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load intents");
      setRows(data.intents || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load intents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: "30px auto", padding: "0 16px" }}>
      <h1>Admin · Purchase Intents</h1>
      <p style={{ opacity: 0.75 }}>Temporary admin view (add auth guard next).</p>

      <button onClick={load} style={{ marginBottom: 12 }}>Refresh</button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!loading && !error && (
        <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f6f6f6" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Created</th>
                <th style={{ textAlign: "left", padding: 8 }}>Status</th>
                <th style={{ textAlign: "left", padding: 8 }}>Amount</th>
                <th style={{ textAlign: "left", padding: 8 }}>UTM Source</th>
                <th style={{ textAlign: "left", padding: 8 }}>Campaign</th>
                <th style={{ textAlign: "left", padding: 8 }}>Intent</th>
                <th style={{ textAlign: "left", padding: 8 }}>Tx</th>
                <th style={{ textAlign: "left", padding: 8 }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{new Date(r.created_at).toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{r.status}</td>
                  <td style={{ padding: 8 }}>{humanUsdc(r.amount_usdc_atomic)} USDC</td>
                  <td style={{ padding: 8 }}>{r.ft_utm_source || "-"}</td>
                  <td style={{ padding: 8 }}>{r.ft_utm_campaign || "-"}</td>
                  <td style={{ padding: 8 }}><code>{r.id.slice(0, 8)}…</code></td>
                  <td style={{ padding: 8 }}>{r.tx_signature ? <code>{r.tx_signature.slice(0, 10)}…</code> : "-"}</td>
                  <td style={{ padding: 8 }}><a href={`/receipt/${r.id}`}>Open</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

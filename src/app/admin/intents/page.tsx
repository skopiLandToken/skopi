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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("");

  async function load(useToken?: string) {
    const t = (useToken ?? token).trim();
    if (!t) {
      setError("Enter admin token first");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      if (sourceFilter.trim()) params.set("source", sourceFilter.trim());

      const res = await fetch(`/api/admin/intents?${params.toString()}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${t}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load intents");
      setRows(data.intents || []);
      localStorage.setItem("skopi_admin_token", t);
    } catch (e: any) {
      setError(e?.message || "Failed to load intents");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("skopi_admin_token") || "";
    if (saved) {
      setToken(saved);
      // defer first load until filters set (defaults are ready)
      setTimeout(() => load(saved), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ maxWidth: 1150, margin: "30px auto", padding: "0 16px" }}>
      <h1>Admin · Purchase Intents</h1>
      <p style={{ opacity: 0.75 }}>Token-protected admin view.</p>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 8 }}>Admin Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter ADMIN_READ_TOKEN"
          style={{ width: "100%", maxWidth: 520, padding: 8, marginBottom: 10 }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            Status:{" "}
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">all</option>
              <option value="created">created</option>
              <option value="pending">pending</option>
              <option value="confirmed">confirmed</option>
              <option value="failed">failed</option>
              <option value="expired">expired</option>
            </select>
          </label>

          <label>
            UTM Source:{" "}
            <input
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              placeholder="e.g. test_x"
              style={{ padding: 6 }}
            />
          </label>

          <button onClick={() => load()} disabled={loading}>
            {loading ? "Loading..." : "Apply / Refresh"}
          </button>
        </div>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p style={{ opacity: 0.7 }}>No intents found for current filters.</p>
      )}

      {!loading && !error && rows.length > 0 && (
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
                  <td style={{ padding: 8 }}>
                    {r.tx_signature ? (
                      <a
                        href={`https://solscan.io/tx/${r.tx_signature}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {r.tx_signature.slice(0, 10)}…
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
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

"use client";

import { useEffect, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  start_at?: string | null;
  end_at?: string | null;
  lock_days: number;
  pool_tokens?: string | null;
  distributed_tokens?: string | null;
  per_user_cap?: string | null;
  created_at: string;
};

export default function AdminAirdropsPage() {
  const [token, setToken] = useState("");
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [lockDays, setLockDays] = useState("90");
  const [poolTokens, setPoolTokens] = useState("");
  const [capPerUser, setCapPerUser] = useState("");

  async function load(useToken?: string) {
    const t = (useToken ?? token).trim();
    if (!t) {
      setError("Enter admin token first");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/airdrop/campaigns", {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load campaigns");
      setRows(data.campaigns || []);
      localStorage.setItem("skopi_admin_token", t);
    } catch (e: any) {
      setError(e?.message || "Failed to load campaigns");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function createCampaign() {
    const t = token.trim();
    if (!t) return setError("Enter admin token first");
    if (!name.trim()) return setError("Campaign name is required");

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/airdrop/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description || null,
          status,
          lock_days: Number(lockDays || 90),
          pool_tokens: poolTokens || null,
          per_user_cap: capPerUser || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to create campaign");

      setName("");
      setDescription("");
      setStatus("draft");
      setLockDays("90");
      setPoolTokens("");
      setCapPerUser("");

      await load(t);
    } catch (e: any) {
      setError(e?.message || "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("skopi_admin_token") || "";
    if (saved) {
      setToken(saved);
      setTimeout(() => load(saved), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ maxWidth: 1200, margin: "30px auto", padding: "0 16px" }}>
      <h1>Admin · Airdrop Campaigns (V2)</h1>
      <p style={{ opacity: 0.75 }}>FCFS pool-limited campaigns with lock period.</p>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 8 }}>Admin Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter ADMIN_READ_TOKEN"
          style={{ width: "100%", maxWidth: 520, padding: 8, marginBottom: 10 }}
        />
        <button onClick={() => load()} disabled={loading}>{loading ? "Loading..." : "Unlock / Refresh"}</button>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Create Campaign</h3>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="finalized">finalized</option>
            <option value="archived">archived</option>
          </select>
          <input value={lockDays} onChange={(e) => setLockDays(e.target.value)} placeholder="Lock days (default 90)" />
          <input value={poolTokens} onChange={(e) => setPoolTokens(e.target.value)} placeholder="Pool tokens (required for FCFS)" />
          <input value={capPerUser} onChange={(e) => setCapPerUser(e.target.value)} placeholder="Per-user cap (optional)" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
        </div>
        <div style={{ marginTop: 10 }}>
          <button onClick={createCampaign} disabled={loading}>{loading ? "Saving..." : "Create Campaign"}</button>
        </div>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f6f6f6" }}>
              <th style={{ textAlign: "left", padding: 8 }}>Created</th>
              <th style={{ textAlign: "left", padding: 8 }}>Name</th>
              <th style={{ textAlign: "left", padding: 8 }}>Status</th>
              <th style={{ textAlign: "left", padding: 8 }}>Lock (days)</th>
              <th style={{ textAlign: "left", padding: 8 }}>Pool</th>
              <th style={{ textAlign: "left", padding: 8 }}>Distributed</th>
              <th style={{ textAlign: "left", padding: 8 }}>Remaining</th>
              <th style={{ textAlign: "left", padding: 8 }}>Per-user cap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pool = r.pool_tokens ? Number(r.pool_tokens) : 0;
              const dist = r.distributed_tokens ? Number(r.distributed_tokens) : 0;
              const remaining = Math.max(pool - dist, 0);
              return (
                <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{new Date(r.created_at).toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{r.name}</td>
                  <td style={{ padding: 8 }}>{r.status}</td>
                  <td style={{ padding: 8 }}>{r.lock_days}</td>
                  <td style={{ padding: 8 }}>{r.pool_tokens || "-"}</td>
                  <td style={{ padding: 8 }}>{r.distributed_tokens || "0"}</td>
                  <td style={{ padding: 8 }}>{r.pool_tokens ? remaining.toFixed(6) : "-"}</td>
                  <td style={{ padding: 8 }}>{r.per_user_cap || "-"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td style={{ padding: 8 }} colSpan={8}>No campaigns yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

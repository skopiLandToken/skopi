"use client";

import { useEffect, useMemo, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  start_at?: string | null;
  end_at?: string | null;
  lock_days: number;
  pool_tokens?: number | null;
  distributed_tokens?: number | null;
  per_user_cap?: number | null;
  remaining_tokens?: number | null;
};

type Allocation = {
  id: string;
  campaign_id: string;
  wallet_address: string;
  total_tokens: string;
  locked_tokens: string;
  claimable_tokens: string;
  lock_end_at?: string | null;
  status: string;
  tx_signature?: string | null;
  created_at: string;
};

function n(v: string | number | null | undefined) {
  if (v == null) return "-";
  const x = Number(v);
  if (Number.isNaN(x)) return String(v);
  return x.toFixed(2).replace(/\.00$/, "");
}

export default function AirdropPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wallet, setWallet] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [amount, setAmount] = useState("25");
  const [claimResult, setClaimResult] = useState<any>(null);
  const [claimLoading, setClaimLoading] = useState(false);

  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) || null,
    [campaigns, campaignId]
  );

  async function loadCampaigns() {
    setLoadingCampaigns(true);
    setError(null);
    try {
      const res = await fetch("/api/airdrop/campaigns", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load campaigns");
      const rows = data.campaigns || [];
      setCampaigns(rows);
      if (!campaignId && rows.length > 0) setCampaignId(rows[0].id);
    } catch (e: any) {
      setError(e?.message || "Failed to load campaigns");
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  }

  async function claim() {
    setClaimLoading(true);
    setClaimResult(null);
    setError(null);
    try {
      if (!campaignId) throw new Error("Select a campaign");
      if (!wallet.trim()) throw new Error("Wallet address is required");
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Amount must be > 0");

      const res = await fetch("/api/airdrop/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          wallet_address: wallet.trim(),
          amount_tokens: amt,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setClaimResult({ ok: false, ...data });
      } else {
        setClaimResult({ ok: true, ...data });
      }

      await loadCampaigns();
      await loadAllocations(wallet.trim());
    } catch (e: any) {
      setClaimResult({ ok: false, error: e?.message || "Claim failed" });
    } finally {
      setClaimLoading(false);
    }
  }

  async function loadAllocations(walletAddress?: string) {
    const w = (walletAddress ?? wallet).trim();
    if (!w) return;

    setAllocLoading(true);
    try {
      const res = await fetch(`/api/airdrop/allocations?wallet_address=${encodeURIComponent(w)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load allocations");
      setAllocations(data.allocations || []);
    } catch (e: any) {
      setAllocations([]);
      setError(e?.message || "Failed to load allocations");
    } finally {
      setAllocLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ maxWidth: 1000, margin: "30px auto", padding: "0 16px" }}>
      <h1>SKOpi Airdrop (V2)</h1>
      <p style={{ opacity: 0.8 }}>First come, first served for active campaign pools. Allocations are locked by campaign policy.</p>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Active Campaigns</h3>
        <button onClick={loadCampaigns} disabled={loadingCampaigns}>
          {loadingCampaigns ? "Refreshing..." : "Refresh Campaigns"}
        </button>

        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f6f6f6" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Name</th>
                <th style={{ textAlign: "left", padding: 8 }}>Status</th>
                <th style={{ textAlign: "left", padding: 8 }}>Pool</th>
                <th style={{ textAlign: "left", padding: 8 }}>Distributed</th>
                <th style={{ textAlign: "left", padding: 8 }}>Remaining</th>
                <th style={{ textAlign: "left", padding: 8 }}>Lock Days</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{c.name}</td>
                  <td style={{ padding: 8 }}>{c.status}</td>
                  <td style={{ padding: 8 }}>{n(c.pool_tokens ?? null)}</td>
                  <td style={{ padding: 8 }}>{n(c.distributed_tokens ?? null)}</td>
                  <td style={{ padding: 8 }}>{n(c.remaining_tokens ?? null)}</td>
                  <td style={{ padding: 8 }}>{c.lock_days}</td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr><td style={{ padding: 8 }} colSpan={6}>No active campaigns.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Claim (FCFS)</h3>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
          <label>
            Campaign
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} style={{ width: "100%" }}>
              <option value="">Select campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label>
            Amount Tokens
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 25" style={{ width: "100%" }} />
          </label>

          <label style={{ gridColumn: "1 / span 2" }}>
            Wallet Address
            <input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Solana wallet" style={{ width: "100%" }} />
          </label>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={claim} disabled={claimLoading}>
            {claimLoading ? "Claiming..." : "Claim Airdrop"}
          </button>
          <button onClick={() => loadAllocations()} disabled={allocLoading || !wallet.trim()}>
            {allocLoading ? "Loading..." : "Load My Allocations"}
          </button>
        </div>

        {selectedCampaign && (
          <p style={{ marginTop: 8, opacity: 0.8 }}>
            Campaign remaining: <strong>{n(selectedCampaign.remaining_tokens ?? null)}</strong>
          </p>
        )}

        {claimResult && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: claimResult.ok ? "#eafbea" : "#fff2f2" }}>
            {claimResult.ok ? (
              <div>
                ✅ Claim accepted. Allocation: <code>{claimResult.allocation_id}</code> · Remaining: {n(claimResult.remaining_tokens ?? null)}
              </div>
            ) : (
              <div>
                ❌ Claim failed: <strong>{claimResult.error || "unknown"}</strong>
                {claimResult.remaining_tokens != null ? ` · Remaining: ${n(claimResult.remaining_tokens)}` : ""}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>My Allocations</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f6f6f6" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Created</th>
                <th style={{ textAlign: "left", padding: 8 }}>Campaign</th>
                <th style={{ textAlign: "left", padding: 8 }}>Total</th>
                <th style={{ textAlign: "left", padding: 8 }}>Locked</th>
                <th style={{ textAlign: "left", padding: 8 }}>Claimable</th>
                <th style={{ textAlign: "left", padding: 8 }}>Lock End</th>
                <th style={{ textAlign: "left", padding: 8 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{new Date(a.created_at).toLocaleString()}</td>
                  <td style={{ padding: 8 }}><code>{a.campaign_id.slice(0, 8)}…</code></td>
                  <td style={{ padding: 8 }}>{n(a.total_tokens)}</td>
                  <td style={{ padding: 8 }}>{n(a.locked_tokens)}</td>
                  <td style={{ padding: 8 }}>{n(a.claimable_tokens)}</td>
                  <td style={{ padding: 8 }}>{a.lock_end_at ? new Date(a.lock_end_at).toLocaleString() : "-"}</td>
                  <td style={{ padding: 8 }}>{a.status}</td>
                </tr>
              ))}
              {allocations.length === 0 && (
                <tr><td style={{ padding: 8 }} colSpan={7}>No allocations loaded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {error && <p style={{ color: "crimson", marginTop: 10 }}>{error}</p>}
    </main>
  );
}

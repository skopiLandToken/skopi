"use client";

import { useEffect, useMemo, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  status: string;
  lock_days: number;
  pool_tokens?: number | null;
  distributed_tokens?: number | null;
  remaining_tokens?: number | null;
};

type Task = {
  id: string;
  campaign_id: string;
  code: string;
  title: string;
  description?: string | null;
  bounty_tokens: string;
  requires_manual: boolean;
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
  created_at: string;
};

type Submission = {
  id: string;
  campaign_id: string;
  task_id: string;
  task_code?: string | null;
  task_title?: string | null;
  wallet_address: string;
  handle?: string | null;
  evidence_url: string;
  state: string;
  notes?: string | null;
  reviewer?: string | null;
  reviewed_at?: string | null;
  submitted_at: string;
};

function fmt(v: string | number | null | undefined) {
  if (v == null) return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toFixed(2).replace(/\.00$/, "");
}

function stateBadgeStyle(state: string) {
  if (state === "pending_review") return { background: "#fff7e6", color: "#8a5a00" };
  if (state === "verified_auto" || state === "verified_manual") return { background: "#eafbea", color: "#1f6b2a" };
  if (state === "revoked") return { background: "#fff2f2", color: "#8a1f1f" };
  return { background: "#f2f2f2", color: "#444" };
}

export default function AirdropPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [campaignId, setCampaignId] = useState("");
  const [taskCode, setTaskCode] = useState("");
  const [wallet, setWallet] = useState("");
  const [handle, setHandle] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submissionFilter, setSubmissionFilter] = useState<"all" | "pending_review" | "verified_auto" | "verified_manual" | "revoked">("all");

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) || null,
    [campaigns, campaignId]
  );

  const selectedTask = useMemo(
    () => tasks.find((t) => t.code === taskCode) || null,
    [tasks, taskCode]
  );

  const filteredSubmissions = useMemo(
    () => (submissionFilter === "all" ? submissions : submissions.filter((s) => s.state === submissionFilter)),
    [submissions, submissionFilter]
  );

  async function loadCampaigns() {
    try {
      const res = await fetch("/api/airdrop/campaigns", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load campaigns");
      const rows = data.campaigns || [];
      setCampaigns(rows);
      if (!campaignId && rows.length > 0) setCampaignId(rows[0].id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load campaigns";
      setError(msg);
    }
  }

  async function loadTasks(cid?: string) {
    const id = cid || campaignId;
    if (!id) return;
    try {
      const res = await fetch(`/api/airdrop/tasks?campaign_id=${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load tasks");
      const rows = data.tasks || [];
      setTasks(rows);
      if (rows.length > 0) setTaskCode(rows[0].code);
      else setTaskCode("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load tasks";
      setError(msg);
      setTasks([]);
    }
  }

  async function loadAllocations(walletAddress?: string) {
    const w = (walletAddress ?? wallet).trim();
    if (!w) return;
    try {
      const res = await fetch(`/api/airdrop/allocations?wallet_address=${encodeURIComponent(w)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load allocations");
      setAllocations(data.allocations || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load allocations";
      setError(msg);
      setAllocations([]);
    }
  }

  async function loadSubmissions(walletAddress?: string) {
    const w = (walletAddress ?? wallet).trim();
    if (!w) return;
    try {
      const query = new URLSearchParams({ wallet_address: w });
      if (campaignId) query.set("campaign_id", campaignId);
      const res = await fetch(`/api/airdrop/submissions?${query.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load submissions");
      setSubmissions(data.submissions || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load submissions";
      setError(msg);
      setSubmissions([]);
    }
  }

  async function submitTask() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      if (!campaignId) throw new Error("Select campaign");
      if (!taskCode) throw new Error("Select task");
      if (!wallet.trim()) throw new Error("Wallet address is required");
      if (!evidenceUrl.trim()) throw new Error("Evidence URL is required");

      const res = await fetch("/api/airdrop/submit-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          task_code: taskCode,
          wallet_address: wallet.trim(),
          handle: handle.trim() || null,
          evidence_url: evidenceUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Submission failed");
      }

      const alloc = data?.allocation;
      if (alloc?.ok) {
        setResult({ ok: true, message: `Submission accepted and allocated. Remaining pool: ${fmt(alloc.remaining_tokens)}` });
      } else if (data?.message) {
        setResult({ ok: true, message: data.message });
      } else {
        setResult({ ok: true, message: "Submission accepted." });
      }

      await loadCampaigns();
      await loadAllocations(wallet.trim());
      await loadSubmissions(wallet.trim());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Submission failed";
      setResult({ ok: false, message: msg });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (campaignId) loadTasks(campaignId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  return (
    <main style={{ maxWidth: 1000, margin: "30px auto", padding: "0 16px" }}>
      <h1>SKOpi Airdrop (V2)</h1>
      <p style={{ opacity: 0.8 }}>Submit task proof via URL. Auto tasks allocate instantly; manual tasks go to review.</p>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Active Campaigns</h3>
        <button onClick={loadCampaigns}>Refresh Campaigns</button>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: 14 }}>
          <thead><tr style={{ background: "#f6f6f6" }}><th style={{ textAlign: "left", padding: 8 }}>Name</th><th style={{ textAlign: "left", padding: 8 }}>Pool</th><th style={{ textAlign: "left", padding: 8 }}>Distributed</th><th style={{ textAlign: "left", padding: 8 }}>Remaining</th></tr></thead>
          <tbody>
            {campaigns.map((c) => <tr key={c.id} style={{ borderTop: "1px solid #eee" }}><td style={{ padding: 8 }}>{c.name}</td><td style={{ padding: 8 }}>{fmt(c.pool_tokens)}</td><td style={{ padding: 8 }}>{fmt(c.distributed_tokens)}</td><td style={{ padding: 8 }}>{fmt(c.remaining_tokens)}</td></tr>)}
            {campaigns.length === 0 && <tr><td style={{ padding: 8 }} colSpan={4}>No active campaigns.</td></tr>}
          </tbody>
        </table>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Submit Task Evidence</h3>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Campaign</span>
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              <option value="">Select campaign</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Task</span>
            <select value={taskCode} onChange={(e) => setTaskCode(e.target.value)}>
              <option value="">Select task</option>
              {tasks.map((t) => <option key={t.id} value={t.code}>{t.title} ({fmt(t.bounty_tokens)} SKOpi) {t.requires_manual ? "· manual" : "· auto"}</option>)}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4, gridColumn: "1 / span 2" }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Wallet Address</span>
            <input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Solana wallet" />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Social Handle (optional)</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@username" />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Evidence URL</span>
            <input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://..." />
          </label>
        </div>

        {selectedTask && (
          <p style={{ marginTop: 8, opacity: 0.8 }}>
            Selected task: <strong>{selectedTask.title}</strong> · Bounty: <strong>{fmt(selectedTask.bounty_tokens)} SKOpi</strong> · Mode: <strong>{selectedTask.requires_manual ? "Manual review" : "Auto"}</strong>
          </p>
        )}

        {selectedCampaign && (
          <p style={{ marginTop: 4, opacity: 0.8 }}>
            Campaign remaining: <strong>{fmt(selectedCampaign.remaining_tokens)}</strong>
          </p>
        )}

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={submitTask} disabled={loading}>{loading ? "Submitting..." : "Submit Evidence"}</button>
          <button onClick={() => loadAllocations()} disabled={!wallet.trim()}>Load My Allocations</button>
          <button onClick={() => loadSubmissions()} disabled={!wallet.trim()}>Load My Submissions</button>
        </div>

        {result && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: result.ok ? "#eafbea" : "#fff2f2" }}>
            {result.ok ? "✅ " : "❌ "}{result.message}
          </div>
        )}
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>My Allocations</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead><tr style={{ background: "#f6f6f6" }}><th style={{ textAlign: "left", padding: 8 }}>Created</th><th style={{ textAlign: "left", padding: 8 }}>Campaign</th><th style={{ textAlign: "left", padding: 8 }}>Total</th><th style={{ textAlign: "left", padding: 8 }}>Locked</th><th style={{ textAlign: "left", padding: 8 }}>Claimable</th><th style={{ textAlign: "left", padding: 8 }}>Status</th></tr></thead>
          <tbody>
            {allocations.map((a) => <tr key={a.id} style={{ borderTop: "1px solid #eee" }}><td style={{ padding: 8 }}>{new Date(a.created_at).toLocaleString()}</td><td style={{ padding: 8 }}><code>{a.campaign_id.slice(0, 8)}…</code></td><td style={{ padding: 8 }}>{fmt(a.total_tokens)}</td><td style={{ padding: 8 }}>{fmt(a.locked_tokens)}</td><td style={{ padding: 8 }}>{fmt(a.claimable_tokens)}</td><td style={{ padding: 8 }}>{a.status}</td></tr>)}
            {allocations.length === 0 && <tr><td style={{ padding: 8 }} colSpan={6}>No allocations loaded yet.</td></tr>}
          </tbody>
        </table>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>My Submissions</h3>
          <label style={{ fontSize: 13 }}>
            Filter state{" "}
            <select value={submissionFilter} onChange={(e) => setSubmissionFilter(e.target.value as "all" | "pending_review" | "verified_auto" | "verified_manual" | "revoked")}>
              <option value="all">all</option>
              <option value="pending_review">pending_review</option>
              <option value="verified_auto">verified_auto</option>
              <option value="verified_manual">verified_manual</option>
              <option value="revoked">revoked</option>
            </select>
          </label>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 8 }}>
          <thead>
            <tr style={{ background: "#f6f6f6" }}>
              <th style={{ textAlign: "left", padding: 8 }}>Submitted</th>
              <th style={{ textAlign: "left", padding: 8 }}>Task</th>
              <th style={{ textAlign: "left", padding: 8 }}>Evidence</th>
              <th style={{ textAlign: "left", padding: 8 }}>State</th>
              <th style={{ textAlign: "left", padding: 8 }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.map((s) => (
              <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>{new Date(s.submitted_at).toLocaleString()}</td>
                <td style={{ padding: 8 }}>
                  <div>{s.task_title || s.task_code || s.task_id}</div>
                  {s.task_code && <code>{s.task_code}</code>}
                </td>
                <td style={{ padding: 8 }}><a href={s.evidence_url} target="_blank" rel="noreferrer">Open</a></td>
                <td style={{ padding: 8 }}>
                  <span style={{ ...stateBadgeStyle(s.state), padding: "2px 8px", borderRadius: 999, fontSize: 12 }}>{s.state}</span>
                </td>
                <td style={{ padding: 8 }}>{s.notes || "-"}</td>
              </tr>
            ))}
            {filteredSubmissions.length === 0 && <tr><td style={{ padding: 8 }} colSpan={5}>No submissions for selected filter.</td></tr>}
          </tbody>
        </table>
      </section>

      {error && <p style={{ color: "crimson", marginTop: 10 }}>{error}</p>}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  status: string;
  lock_days: number;
  pool_tokens?: string | null;
  distributed_tokens?: string | null;
  per_user_cap?: string | null;
  created_at: string;
};

type Task = {
  id: string;
  campaign_id: string;
  code: string;
  title: string;
  bounty_tokens: string;
  requires_manual: boolean;
  max_per_user?: number | null;
  active: boolean;
};

type Submission = {
  id: string;
  campaign_id: string;
  task_id: string;
  user_id?: string | null;
  wallet_address: string;
  handle?: string | null;
  evidence_url: string;
  state: string;
  submitted_at: string;
  notes?: string | null;
};

export default function AdminAirdropsPage() {
  const [token, setToken] = useState("");
  const [rows, setRows] = useState<Campaign[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [status, setStatus] = useState("draft");
  const [lockDays, setLockDays] = useState("90");
  const [poolTokens, setPoolTokens] = useState("");
  const [capPerUser, setCapPerUser] = useState("");
  const [description, setDescription] = useState("");

  const [taskCode, setTaskCode] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskBounty, setTaskBounty] = useState("0");
  const [taskManual, setTaskManual] = useState(false);
  const [taskMaxPerUser, setTaskMaxPerUser] = useState("");

  async function loadCampaigns(useToken?: string) {
    const t = (useToken ?? token).trim();
    if (!t) return setError("Enter admin token first");
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/airdrop/campaigns", { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load campaigns");
      setRows(data.campaigns || []);
      localStorage.setItem("skopi_admin_token", t);
      if (!selectedCampaignId && data.campaigns?.length) setSelectedCampaignId(data.campaigns[0].id);
    } catch (e: any) {
      setError(e?.message || "Failed to load campaigns");
    } finally { setLoading(false); }
  }

  async function loadTasks(campaignId?: string, useToken?: string) {
    const t = (useToken ?? token).trim();
    const cid = campaignId || selectedCampaignId;
    if (!t || !cid) return;
    const res = await fetch(`/api/admin/airdrop/tasks?campaign_id=${cid}`, { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
    const data = await res.json();
    if (res.ok && data.ok) setTasks(data.tasks || []);
  }

  async function loadSubmissions(campaignId?: string, useToken?: string) {
    const t = (useToken ?? token).trim();
    const cid = campaignId || selectedCampaignId;
    if (!t) return;
    const q = new URLSearchParams();
    q.set("state", "pending_review");
    if (cid) q.set("campaign_id", cid);
    const res = await fetch(`/api/admin/airdrop/submissions?${q.toString()}`, { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
    const data = await res.json();
    if (res.ok && data.ok) setSubmissions(data.submissions || []);
  }

  async function createCampaign() {
    const t = token.trim();
    if (!t) return setError("Enter admin token first");
    if (!name.trim()) return setError("Campaign name required");
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/airdrop/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          name: name.trim(), description: description || null, status,
          lock_days: Number(lockDays || 90), pool_tokens: poolTokens || null, per_user_cap: capPerUser || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to create campaign");
      setName(""); setStatus("draft"); setLockDays("90"); setPoolTokens(""); setCapPerUser(""); setDescription("");
      await loadCampaigns(t);
    } catch (e: any) { setError(e?.message || "Failed to create campaign"); }
    finally { setLoading(false); }
  }

  async function createTask() {
    const t = token.trim();
    if (!t) return setError("Enter admin token first");
    if (!selectedCampaignId) return setError("Select campaign first");
    if (!taskCode.trim() || !taskTitle.trim()) return setError("Task code/title required");

    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/airdrop/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          code: taskCode.trim().toLowerCase(),
          title: taskTitle.trim(),
          description: taskDesc || null,
          bounty_tokens: Number(taskBounty || 0),
          requires_manual: taskManual,
          max_per_user: taskMaxPerUser ? Number(taskMaxPerUser) : null,
          active: true,
          sort_order: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to create task");
      setTaskCode(""); setTaskTitle(""); setTaskDesc(""); setTaskBounty("0"); setTaskManual(false); setTaskMaxPerUser("");
      await loadTasks(selectedCampaignId, t);
    } catch (e: any) { setError(e?.message || "Failed to create task"); }
    finally { setLoading(false); }
  }

  async function reviewSubmission(submissionId: string, action: "approve" | "reject") {
    const t = token.trim();
    if (!t) return setError("Enter admin token first");
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/airdrop/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ submission_id: submissionId, action, reviewer: "iosif" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || `Failed to ${action}`);
      await loadSubmissions(selectedCampaignId, t);
      await loadCampaigns(t);
    } catch (e: any) { setError(e?.message || "Review failed"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const saved = localStorage.getItem("skopi_admin_token") || "";
    if (saved) {
      setToken(saved);
      setTimeout(() => loadCampaigns(saved), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCampaignId) return;
    loadTasks(selectedCampaignId);
    loadSubmissions(selectedCampaignId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId]);

  return (
    <main style={{ maxWidth: 1100, margin: "30px auto", padding: "0 16px" }}>
      <h1>Admin · Airdrop Campaigns (V2)</h1>
      <p style={{ opacity: 0.75 }}>Campaigns, tasks/bounties, and manual review queue.</p>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 8 }}>Admin Token</label>
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Enter ADMIN_READ_TOKEN" style={{ width: "100%", maxWidth: 520, padding: 8, marginBottom: 10 }} />
        <button onClick={() => loadCampaigns()} disabled={loading}>{loading ? "Loading..." : "Unlock / Refresh"}</button>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Create Campaign</h3>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">draft</option><option value="active">active</option><option value="paused">paused</option><option value="finalized">finalized</option><option value="archived">archived</option>
          </select>
          <input value={lockDays} onChange={(e) => setLockDays(e.target.value)} placeholder="Lock days" />
          <input value={poolTokens} onChange={(e) => setPoolTokens(e.target.value)} placeholder="Pool tokens" />
          <input value={capPerUser} onChange={(e) => setCapPerUser(e.target.value)} placeholder="Per-user cap" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        </div>
        <div style={{ marginTop: 10 }}><button onClick={createCampaign} disabled={loading}>Create Campaign</button></div>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Tasks & Bounties</h3>
        <div style={{ marginBottom: 8 }}>
          <label>Campaign: <select value={selectedCampaignId} onChange={(e) => setSelectedCampaignId(e.target.value)}>
            <option value="">Select campaign</option>
            {rows.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
          </select></label>
        </div>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
          <input value={taskCode} onChange={(e) => setTaskCode(e.target.value)} placeholder="Task code" />
          <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" />
          <input value={taskBounty} onChange={(e) => setTaskBounty(e.target.value)} placeholder="Bounty tokens" />
          <input value={taskMaxPerUser} onChange={(e) => setTaskMaxPerUser(e.target.value)} placeholder="Max per user" />
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={taskManual} onChange={(e) => setTaskManual(e.target.checked)} />Requires manual review</label>
          <input value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} placeholder="Task description" />
        </div>
        <div style={{ marginTop: 10 }}><button onClick={createTask} disabled={loading || !selectedCampaignId}>Add Task</button></div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 10 }}>
          <thead><tr style={{ background: "#f6f6f6" }}><th style={{ textAlign: "left", padding: 8 }}>Code</th><th style={{ textAlign: "left", padding: 8 }}>Title</th><th style={{ textAlign: "left", padding: 8 }}>Bounty</th><th style={{ textAlign: "left", padding: 8 }}>Manual?</th></tr></thead>
          <tbody>
            {tasks.map((t) => <tr key={t.id} style={{ borderTop: "1px solid #eee" }}><td style={{ padding: 8 }}><code>{t.code}</code></td><td style={{ padding: 8 }}>{t.title}</td><td style={{ padding: 8 }}>{t.bounty_tokens}</td><td style={{ padding: 8 }}>{t.requires_manual ? "yes" : "no"}</td></tr>)}
            {tasks.length === 0 && <tr><td style={{ padding: 8 }} colSpan={4}>No tasks for selected campaign.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Manual Review Queue (pending_review)</h3>
        <button onClick={() => loadSubmissions()} disabled={loading}>Refresh Queue</button>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 10 }}>
          <thead><tr style={{ background: "#f6f6f6" }}>
            <th style={{ textAlign: "left", padding: 8 }}>Submitted</th>
            <th style={{ textAlign: "left", padding: 8 }}>Wallet</th>
            <th style={{ textAlign: "left", padding: 8 }}>Handle</th>
            <th style={{ textAlign: "left", padding: 8 }}>Evidence</th>
            <th style={{ textAlign: "left", padding: 8 }}>State</th>
            <th style={{ textAlign: "left", padding: 8 }}>Actions</th>
          </tr></thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>{new Date(s.submitted_at).toLocaleString()}</td>
                <td style={{ padding: 8 }}><code>{s.wallet_address.slice(0, 10)}…</code></td>
                <td style={{ padding: 8 }}>{s.handle || "-"}</td>
                <td style={{ padding: 8 }}><a href={s.evidence_url} target="_blank" rel="noreferrer">Open</a></td>
                <td style={{ padding: 8 }}>{s.state}</td>
                <td style={{ padding: 8, display: "flex", gap: 6 }}>
                  <button onClick={() => reviewSubmission(s.id, "approve")} disabled={loading}>Approve</button>
                  <button onClick={() => reviewSubmission(s.id, "reject")} disabled={loading}>Reject</button>
                </td>
              </tr>
            ))}
            {submissions.length === 0 && <tr><td style={{ padding: 8 }} colSpan={6}>No pending submissions.</td></tr>}
          </tbody>
        </table>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, border: "1px solid #ddd" }}>
        <thead>
          <tr style={{ background: "#f6f6f6" }}>
            <th style={{ textAlign: "left", padding: 8 }}>Created</th><th style={{ textAlign: "left", padding: 8 }}>Name</th><th style={{ textAlign: "left", padding: 8 }}>Status</th><th style={{ textAlign: "left", padding: 8 }}>Lock</th><th style={{ textAlign: "left", padding: 8 }}>Pool</th><th style={{ textAlign: "left", padding: 8 }}>Distributed</th><th style={{ textAlign: "left", padding: 8 }}>Per-user cap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
              <td style={{ padding: 8 }}>{new Date(r.created_at).toLocaleString()}</td>
              <td style={{ padding: 8 }}>{r.name}</td>
              <td style={{ padding: 8 }}>{r.status}</td>
              <td style={{ padding: 8 }}>{r.lock_days}</td>
              <td style={{ padding: 8 }}>{r.pool_tokens || "-"}</td>
              <td style={{ padding: 8 }}>{r.distributed_tokens || "0"}</td>
              <td style={{ padding: 8 }}>{r.per_user_cap || "-"}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td style={{ padding: 8 }} colSpan={7}>No campaigns yet.</td></tr>}
        </tbody>
      </table>
    </main>
  );
}

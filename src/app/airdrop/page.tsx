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

function humanizeSubmissionError(code: string) {
  const map: Record<string, string> = {
    campaign_not_active: "This campaign is not active right now.",
    campaign_not_started: "This campaign has not started yet.",
    campaign_ended: "This campaign has already ended.",
    campaign_not_found: "Campaign not found.",
    task_not_found: "Task not found for this campaign.",
    task_inactive: "This task is currently inactive.",
    evidence_url_invalid: "Please paste a valid URL starting with http:// or https://",
    evidence_https_required: "This task requires an https:// evidence URL.",
    evidence_too_short: "Evidence URL looks too short for this task's rules.",
    evidence_domain_not_allowed: "This proof link does not match the allowed domain list for this task.",
    duplicate_evidence: "This exact evidence link was already submitted for this task.",
    rate_limited: "Too many submissions recently. Please wait a bit and try again.",
    task_limit_reached: "You already reached the max submissions for this task.",
    over_user_cap: "This claim would exceed your campaign cap.",
    insufficient_pool: "Airdrop pool is currently insufficient for this bounty.",
    pool_not_set: "Campaign pool is not configured yet.",
    invalid_wallet: "Wallet format looks invalid.",
  };
  return map[code] || code || "Submission failed";
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
  const [clientSubmissionId, setClientSubmissionId] = useState(() => crypto.randomUUID());

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submissionFilter, setSubmissionFilter] = useState<"all" | "pending_review" | "verified_auto" | "verified_manual" | "revoked">("all");

  const selectedCampaign = useMemo(() => campaigns.find((c) => c.id === campaignId) || null, [campaigns, campaignId]);
  const selectedTask = useMemo(() => tasks.find((t) => t.code === taskCode) || null, [tasks, taskCode]);
  const filteredSubmissions = useMemo(
    () => (submissionFilter === "all" ? submissions : submissions.filter((s) => s.state === submissionFilter)),
    [submissions, submissionFilter]
  );

  const submissionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: submissions.length, pending_review: 0, verified_auto: 0, verified_manual: 0, revoked: 0 };
    for (const s of submissions) counts[s.state] = (counts[s.state] || 0) + 1;
    return counts;
  }, [submissions]);

  async function loadCampaigns() {
    try {
      const res = await fetch("/api/airdrop/campaigns", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load campaigns");
      const rows = data.campaigns || [];
      setCampaigns(rows);
      if (!campaignId && rows.length > 0) setCampaignId(rows[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns");
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
      setError(e instanceof Error ? e.message : "Failed to load tasks");
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
      setError(e instanceof Error ? e.message : "Failed to load allocations");
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
      setError(e instanceof Error ? e.message : "Failed to load submissions");
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
        body: JSON.stringify({ campaign_id: campaignId, task_code: taskCode, wallet_address: wallet.trim(), handle: handle.trim() || null, evidence_url: evidenceUrl.trim(), client_submission_id: clientSubmissionId }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        const raw = String(data?.error || "submission_failed");
        throw new Error(humanizeSubmissionError(raw.trim().toLowerCase().replace(/\s+/g, "_")));
      }

      const alloc = data?.allocation;
      if (alloc?.ok) setResult({ ok: true, message: `Submission accepted and allocated. Remaining pool: ${fmt(alloc.remaining_tokens)}` });
      else setResult({ ok: true, message: data?.message || "Submission accepted." });

      await loadCampaigns();
      await loadAllocations(wallet.trim());
      await loadSubmissions(wallet.trim());
      setEvidenceUrl("");
      setClientSubmissionId(crypto.randomUUID());
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "Submission failed" });
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
    <main style={{ maxWidth: 1080, margin: "28px auto", padding: "0 16px 36px", fontFamily: "Inter, system-ui, sans-serif", color: "#111" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ marginBottom: 6 }}>SKOpi Airdrop (V2)</h1>
        <p style={{ opacity: 0.75, margin: 0 }}>Submit task proof via URL. Auto tasks allocate instantly; manual tasks go to review.</p>
      </div>

      <section style={{ border: "1px solid #e8e8e8", borderRadius: 14, padding: 14, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Active Campaigns</h3>
          <button onClick={loadCampaigns}>Refresh</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr style={{ background: "#f8fafc" }}><th style={{ textAlign: "left", padding: 10 }}>Name</th><th style={{ textAlign: "left", padding: 10 }}>Pool</th><th style={{ textAlign: "left", padding: 10 }}>Distributed</th><th style={{ textAlign: "left", padding: 10 }}>Remaining</th></tr></thead>
            <tbody>
              {campaigns.map((c) => <tr key={c.id} style={{ borderTop: "1px solid #eee" }}><td style={{ padding: 10 }}>{c.name}</td><td style={{ padding: 10 }}>{fmt(c.pool_tokens)}</td><td style={{ padding: 10 }}>{fmt(c.distributed_tokens)}</td><td style={{ padding: 10 }}><strong>{fmt(c.remaining_tokens)}</strong></td></tr>)}
              {campaigns.length === 0 && <tr><td style={{ padding: 10 }} colSpan={4}>No active campaigns.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ border: "1px solid #e8e8e8", borderRadius: 14, padding: 14, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
        <h3 style={{ marginTop: 0 }}>Submit Task Evidence</h3>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, opacity: 0.75 }}>Campaign</span><select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}><option value="">Select campaign</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, opacity: 0.75 }}>Task</span><select value={taskCode} onChange={(e) => setTaskCode(e.target.value)}><option value="">Select task</option>{tasks.map((t) => <option key={t.id} value={t.code}>{t.title} ({fmt(t.bounty_tokens)} SKOpi) {t.requires_manual ? "· manual" : "· auto"}</option>)}</select></label>
          <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, opacity: 0.75 }}>Wallet Address</span><input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Solana wallet" /></label>
          <label style={{ display: "grid", gap: 4 }}><span style={{ fontSize: 12, opacity: 0.75 }}>Social Handle (optional)</span><input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@username" /></label>
          <label style={{ display: "grid", gap: 4, gridColumn: "1 / -1" }}><span style={{ fontSize: 12, opacity: 0.75 }}>Evidence URL</span><input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://..." /></label>
        </div>

        {selectedTask && <p style={{ marginTop: 10, opacity: 0.82, fontSize: 14 }}>Task: <strong>{selectedTask.title}</strong> · Bounty: <strong>{fmt(selectedTask.bounty_tokens)} SKOpi</strong> · Mode: <strong>{selectedTask.requires_manual ? "Manual review" : "Auto"}</strong></p>}
        {selectedCampaign && <p style={{ marginTop: 4, opacity: 0.82, fontSize: 14 }}>Campaign remaining: <strong>{fmt(selectedCampaign.remaining_tokens)}</strong></p>}

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={submitTask} disabled={loading}>{loading ? "Submitting..." : "Submit Evidence"}</button>
          <button onClick={() => loadAllocations()} disabled={!wallet.trim()}>Load My Allocations</button>
          <button onClick={() => loadSubmissions()} disabled={!wallet.trim()}>Load My Submissions</button>
        </div>

        {result && <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: result.ok ? "#ecfdf3" : "#fef2f2", border: `1px solid ${result.ok ? "#b7f0cd" : "#fecaca"}` }}>{result.ok ? "✅ " : "❌ "}{result.message}</div>}
      </section>

      <section style={{ border: "1px solid #e8e8e8", borderRadius: 14, padding: 14, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
        <h3 style={{ marginTop: 0 }}>My Allocations</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr style={{ background: "#f8fafc" }}><th style={{ textAlign: "left", padding: 10 }}>Created</th><th style={{ textAlign: "left", padding: 10 }}>Campaign</th><th style={{ textAlign: "left", padding: 10 }}>Total</th><th style={{ textAlign: "left", padding: 10 }}>Locked</th><th style={{ textAlign: "left", padding: 10 }}>Claimable</th><th style={{ textAlign: "left", padding: 10 }}>Status</th></tr></thead>
            <tbody>
              {allocations.map((a) => <tr key={a.id} style={{ borderTop: "1px solid #eee" }}><td style={{ padding: 10 }}>{new Date(a.created_at).toLocaleString()}</td><td style={{ padding: 10 }}><code>{a.campaign_id.slice(0, 8)}…</code></td><td style={{ padding: 10 }}>{fmt(a.total_tokens)}</td><td style={{ padding: 10 }}>{fmt(a.locked_tokens)}</td><td style={{ padding: 10 }}>{fmt(a.claimable_tokens)}</td><td style={{ padding: 10 }}>{a.status}</td></tr>)}
              {allocations.length === 0 && <tr><td style={{ padding: 10 }} colSpan={6}>No allocations loaded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ border: "1px solid #e8e8e8", borderRadius: 14, padding: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>My Submissions</h3>
          <label style={{ fontSize: 13 }}>Filter state <select value={submissionFilter} onChange={(e) => setSubmissionFilter(e.target.value as "all" | "pending_review" | "verified_auto" | "verified_manual" | "revoked")}><option value="all">all</option><option value="pending_review">pending_review</option><option value="verified_auto">verified_auto</option><option value="verified_manual">verified_manual</option><option value="revoked">revoked</option></select></label>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, fontSize: 12 }}>
          <span style={{ padding: "2px 8px", borderRadius: 999, background: "#f2f2f2" }}>all: {submissionCounts.all}</span>
          <span style={{ padding: "2px 8px", borderRadius: 999, ...stateBadgeStyle("pending_review") }}>pending: {submissionCounts.pending_review || 0}</span>
          <span style={{ padding: "2px 8px", borderRadius: 999, ...stateBadgeStyle("verified_auto") }}>auto: {submissionCounts.verified_auto || 0}</span>
          <span style={{ padding: "2px 8px", borderRadius: 999, ...stateBadgeStyle("verified_manual") }}>manual: {submissionCounts.verified_manual || 0}</span>
          <span style={{ padding: "2px 8px", borderRadius: 999, ...stateBadgeStyle("revoked") }}>revoked: {submissionCounts.revoked || 0}</span>
        </div>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr style={{ background: "#f8fafc" }}><th style={{ textAlign: "left", padding: 10 }}>Submitted</th><th style={{ textAlign: "left", padding: 10 }}>Task</th><th style={{ textAlign: "left", padding: 10 }}>Evidence</th><th style={{ textAlign: "left", padding: 10 }}>State</th><th style={{ textAlign: "left", padding: 10 }}>Notes</th></tr></thead>
            <tbody>
              {filteredSubmissions.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 10 }}>{new Date(s.submitted_at).toLocaleString()}</td>
                  <td style={{ padding: 10 }}><div>{s.task_title || s.task_code || s.task_id}</div>{s.task_code && <code>{s.task_code}</code>}</td>
                  <td style={{ padding: 10 }}><a href={s.evidence_url} target="_blank" rel="noreferrer">Open</a></td>
                  <td style={{ padding: 10 }}><span style={{ ...stateBadgeStyle(s.state), padding: "2px 8px", borderRadius: 999, fontSize: 12 }}>{s.state}</span></td>
                  <td style={{ padding: 10 }}>{s.notes || "-"}</td>
                </tr>
              ))}
              {filteredSubmissions.length === 0 && <tr><td style={{ padding: 10 }} colSpan={5}>No submissions for selected filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {error && <p style={{ color: "crimson", marginTop: 10 }}>{error}</p>}
    </main>
  );
}

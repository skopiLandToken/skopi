"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Campaign = {
  id: string;
  name: string;
  status: string;
  platform?: string | null;
  proof_type?: string | null;
  verification_method?: string | null;
  pool_tokens?: string | null;
  per_user_cap?: string | null;
  distributed_tokens?: string | null;
  max_claims?: number | null;
};

type Submission = {
  id: string;
  campaign_id: string;
  task_id?: string | null;
  user_id?: string | null;
  wallet_address?: string | null;
  handle?: string | null;
  evidence_url?: string | null;
  proof_url?: string | null;
  state: string;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewer?: string | null;
  notes?: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function badgeStyle(state: string): React.CSSProperties {
  if (state === "pending_review") {
    return {
      background: "rgba(245, 158, 11, 0.16)",
      color: "#fbbf24",
      border: "1px solid rgba(245, 158, 11, 0.28)",
    };
  }
  if (state === "verified_manual" || state === "verified_auto") {
    return {
      background: "rgba(34, 197, 94, 0.16)",
      color: "#86efac",
      border: "1px solid rgba(34, 197, 94, 0.28)",
    };
  }
  if (state === "revoked") {
    return {
      background: "rgba(239, 68, 68, 0.14)",
      color: "#fca5a5",
      border: "1px solid rgba(239, 68, 68, 0.24)",
    };
  }
  return {
    background: "rgba(255,255,255,.06)",
    color: "#e5e7eb",
    border: "1px solid rgba(255,255,255,.10)",
  };
}

function cardStyle(): React.CSSProperties {
  return {
    background: "rgba(255,255,255,.04)",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,.22)",
  };
}

function buttonStyle(kind: "primary" | "ghost" | "danger" = "ghost"): React.CSSProperties {
  if (kind === "primary") {
    return {
      background: "linear-gradient(135deg, #22c55e, #16a34a)",
      color: "#08110b",
      border: "none",
      borderRadius: 10,
      padding: "10px 14px",
      fontWeight: 700,
      cursor: "pointer",
    };
  }
  if (kind === "danger") {
    return {
      background: "rgba(239,68,68,.16)",
      color: "#fecaca",
      border: "1px solid rgba(239,68,68,.28)",
      borderRadius: 10,
      padding: "10px 14px",
      fontWeight: 700,
      cursor: "pointer",
    };
  }
  return {
    background: "rgba(255,255,255,.04)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  };
}

export default function AdminAirdropsPage() {
  const [accessToken, setAccessToken] = useState("");
  const [email, setEmail] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [stateFilter, setStateFilter] = useState<"pending_review" | "verified_manual" | "verified_auto" | "revoked" | "all">("pending_review");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewer, setReviewer] = useState("admin");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = {
      all: submissions.length,
      pending_review: 0,
      verified_manual: 0,
      verified_auto: 0,
      revoked: 0,
    };
    for (const s of submissions) out[s.state] = (out[s.state] || 0) + 1;
    return out;
  }, [submissions]);

  async function getSessionToken(): Promise<string> {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      throw new Error("You must be logged in with an admin account");
    }
    const token = data.session.access_token;
    const userEmail = data.session.user?.email || "";
    setAccessToken(token);
    setEmail(userEmail);
    if (userEmail && reviewer === "admin") {
      setReviewer(userEmail);
    }
    return token;
  }

  async function authHeaders() {
    const token = accessToken || await getSessionToken();
    return { Authorization: `Bearer ${token}` };
  }

  async function loadCampaigns() {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/airdrop/campaigns", {
        headers,
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load campaigns");

      const rows = Array.isArray(data.campaigns) ? data.campaigns : [];
      setCampaigns(rows);

      if (rows.length && !selectedCampaignId) {
        const pendingFirst =
          rows.find((x: Campaign) => x.name === "Like Our Twitter Page")?.id ||
          rows[0].id;
        setSelectedCampaignId(pendingFirst);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }

  async function loadSubmissions(campaignId?: string, state?: string) {
    const cid = campaignId ?? selectedCampaignId;
    try {
      const headers = await authHeaders();
      const q = new URLSearchParams();
      q.set("state", state || stateFilter);
      if (cid) q.set("campaign_id", cid);

      const res = await fetch(`/api/admin/airdrop/submissions?${q.toString()}`, {
        headers,
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load submissions");

      setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
      setSelectedIds([]);
    } catch (e: any) {
      setError(e?.message || "Failed to load submissions");
    }
  }

  async function runReview(action: "approve" | "reject", submissionIds: string[]) {
    if (submissionIds.length === 0) return setError("Select at least one submission");
    if (action === "reject" && !notes.trim()) return setError("Rejection note required");

    setWorking(true);
    setError(null);
    setMessage(null);

    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/airdrop/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          action,
          submission_ids: submissionIds,
          reviewer: reviewer.trim() || email || "admin",
          notes: notes.trim() || "",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || `Failed to ${action}`);

      setMessage(
        `${action === "approve" ? "Approved" : "Rejected"} ${data.ok_count || 0} submission(s)` +
          ((data.fail_count || 0) > 0 ? `, ${data.fail_count} failed` : "")
      );

      await loadSubmissions(selectedCampaignId, stateFilter);
      setNotes("");
    } catch (e: any) {
      setError(e?.message || `Failed to ${action}`);
    } finally {
      setWorking(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAllVisible() {
    const ids = submissions.map((s) => s.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : ids);
  }

  useEffect(() => {
    getSessionToken().catch((e: any) => {
      setError(e?.message || "Admin session not found");
    });
  }, []);

  useEffect(() => {
    if (accessToken) {
      loadCampaigns();
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken && selectedCampaignId) {
      loadSubmissions(selectedCampaignId, stateFilter);
    }
  }, [accessToken, selectedCampaignId, stateFilter]);

  return (
    <div style={{ padding: 24, color: "#fff" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 16 }}>
        <div
          style={{
            ...cardStyle(),
            background:
              "linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.03))",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Admin Airdrop Review Queue</h1>
              <div style={{ marginTop: 8, color: "rgba(255,255,255,.72)" }}>
                Logged in as: {email || "checking session..."}
              </div>
            </div>
            <button onClick={() => loadCampaigns()} style={buttonStyle("ghost")} disabled={loading || working}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {error ? (
          <div style={{ ...cardStyle(), color: "#fca5a5", background: "rgba(127,29,29,.28)" }}>
            {error}
          </div>
        ) : null}

        {message ? (
          <div style={{ ...cardStyle(), color: "#bbf7d0", background: "rgba(20,83,45,.28)" }}>
            {message}
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ ...cardStyle(), display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Campaigns</div>

            <div style={{ display: "grid", gap: 10 }}>
              {campaigns.map((c) => {
                const active = c.id === selectedCampaignId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCampaignId(c.id)}
                    style={{
                      textAlign: "left",
                      background: active ? "rgba(59,130,246,.16)" : "rgba(255,255,255,.03)",
                      border: active
                        ? "1px solid rgba(96,165,250,.35)"
                        : "1px solid rgba(255,255,255,.08)",
                      color: "#fff",
                      borderRadius: 14,
                      padding: 14,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{c.name}</div>
                    <div style={{ marginTop: 6, color: "rgba(255,255,255,.68)", fontSize: 13 }}>
                      {c.status} • {c.platform || "unknown"} • {c.verification_method || "unknown"}
                    </div>
                  </button>
                );
              })}

              {!campaigns.length ? (
                <div style={{ color: "rgba(255,255,255,.62)" }}>No campaigns loaded yet.</div>
              ) : null}
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={cardStyle()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>
                    {selectedCampaign ? selectedCampaign.name : "Select a campaign"}
                  </div>
                  {selectedCampaign ? (
                    <div style={{ marginTop: 8, color: "rgba(255,255,255,.72)", fontSize: 14 }}>
                      platform: {selectedCampaign.platform || "n/a"} • proof: {selectedCampaign.proof_type || "n/a"} • method: {selectedCampaign.verification_method || "n/a"}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(["pending_review", "verified_manual", "verified_auto", "revoked", "all"] as const).map((state) => (
                    <button
                      key={state}
                      onClick={() => setStateFilter(state)}
                      style={{
                        ...buttonStyle(stateFilter === state ? "primary" : "ghost"),
                        padding: "8px 12px",
                      }}
                    >
                      {state} ({counts[state] || 0})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={cardStyle()}>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "220px 1fr auto auto", gap: 10, alignItems: "center" }}>
                  <input
                    value={reviewer}
                    onChange={(e) => setReviewer(e.target.value)}
                    placeholder="reviewer"
                    style={{
                      background: "rgba(255,255,255,.05)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,.12)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      outline: "none",
                    }}
                  />
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Approval note or rejection reason"
                    style={{
                      background: "rgba(255,255,255,.05)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,.12)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => runReview("approve", selectedIds)}
                    style={buttonStyle("primary")}
                    disabled={working || selectedIds.length === 0}
                  >
                    Approve selected
                  </button>
                  <button
                    onClick={() => runReview("reject", selectedIds)}
                    style={buttonStyle("danger")}
                    disabled={working || selectedIds.length === 0}
                  >
                    Reject selected
                  </button>
                </div>

                <div style={{ color: "rgba(255,255,255,.70)", fontSize: 14 }}>
                  Selected: {selectedIds.length}
                </div>
              </div>
            </div>

            <div style={cardStyle()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Submissions</div>
                <button onClick={toggleAllVisible} style={buttonStyle("ghost")}>
                  {submissions.length > 0 && submissions.every((s) => selectedIds.includes(s.id))
                    ? "Unselect all"
                    : "Select all visible"}
                </button>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {submissions.map((s) => {
                  const checked = selectedIds.includes(s.id);
                  const proof = s.proof_url || s.evidence_url || "";
                  return (
                    <div
                      key={s.id}
                      style={{
                        border: checked
                          ? "1px solid rgba(96,165,250,.34)"
                          : "1px solid rgba(255,255,255,.08)",
                        background: checked ? "rgba(59,130,246,.08)" : "rgba(255,255,255,.02)",
                        borderRadius: 14,
                        padding: 14,
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "start" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelected(s.id)}
                          style={{ marginTop: 4 }}
                        />

                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ ...badgeStyle(s.state), borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 800 }}>
                              {s.state}
                            </span>
                            <span style={{ color: "rgba(255,255,255,.62)", fontSize: 13 }}>
                              submitted {new Date(s.submitted_at).toLocaleString()}
                            </span>
                          </div>

                          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                            <div><strong>User ID:</strong> {s.user_id || "—"}</div>
                            <div><strong>Wallet:</strong> {s.wallet_address || "—"}</div>
                            <div><strong>Handle:</strong> {s.handle || "—"}</div>
                            <div><strong>Submission ID:</strong> {s.id}</div>
                          </div>

                          <div>
                            <strong>Proof:</strong>{" "}
                            {proof ? (
                              <a
                                href={proof}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "#93c5fd", textDecoration: "underline" }}
                              >
                                Open proof
                              </a>
                            ) : (
                              <span style={{ color: "rgba(255,255,255,.62)" }}>No proof URL</span>
                            )}
                          </div>

                          {s.notes ? (
                            <div style={{ color: "rgba(255,255,255,.74)" }}>
                              <strong>Notes:</strong> {s.notes}
                            </div>
                          ) : null}

                          {(s.reviewed_at || s.reviewer) ? (
                            <div style={{ color: "rgba(255,255,255,.60)", fontSize: 13 }}>
                              reviewed: {s.reviewed_at ? new Date(s.reviewed_at).toLocaleString() : "—"} by {s.reviewer || "—"}
                            </div>
                          ) : null}
                        </div>

                        <div style={{ display: "grid", gap: 8 }}>
                          <button
                            onClick={() => runReview("approve", [s.id])}
                            style={buttonStyle("primary")}
                            disabled={working || s.state !== "pending_review"}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => runReview("reject", [s.id])}
                            style={buttonStyle("danger")}
                            disabled={working || s.state !== "pending_review"}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!submissions.length ? (
                  <div style={{ color: "rgba(255,255,255,.64)" }}>
                    No submissions found for this filter.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

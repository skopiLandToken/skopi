"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Touch = {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  landingPath?: string | null;
  referrer?: string | null;
  ts?: string;
};

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

function readTouch(key: string): Touch | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function humanUsdc(amountAtomic: number) {
  return (amountAtomic / 1_000_000).toFixed(6).replace(/\.?0+$/, "");
}

function buildSolanaPayUrl(intent: Intent) {
  const amount = humanUsdc(intent.amount_usdc_atomic);
  const recipient = intent.treasury_address;
  const params = new URLSearchParams({
    amount,
    "spl-token": intent.usdc_mint,
    reference: intent.reference_pubkey,
    label: "SKOpi Purchase",
    message: `Intent ${intent.id}`,
  });

  return `solana:${recipient}?${params.toString()}`;
}

function readRefCodeFromUrl(): string | null {
  try {
    const u = new URL(window.location.href);
    const v = u.searchParams.get("ref") || u.searchParams.get("ref_code");
    return v ? v.trim() : null;
  } catch {
    return null;
  }
}

export default function BuyPage() {
  const [amount, setAmount] = useState("25");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);

  const [statusIntentId, setStatusIntentId] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<Intent | null>(null);

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  const payUrl = useMemo(() => (intent ? buildSolanaPayUrl(intent) : ""), [intent]);

  async function createIntent() {
    setLoading(true);
    setError(null);
    setIntent(null);

    try {
      const amountUsdc = Number(amount);
      if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
        throw new Error("Enter a valid amount greater than 0");
      }

      // --- NEW: require login + send Bearer token ---
      const supabase = supabaseBrowser();
      const { data: sess, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw new Error(sessErr.message);
      const token = sess.session?.access_token;
      if (!token) throw new Error("You must be logged in to create a purchase intent.");
      // --- END NEW ---

      const firstTouch = readTouch("skopi_first_touch");
      const lastTouch = readTouch("skopi_last_touch");
      const refCode = readRefCodeFromUrl();

      const res = await fetch("/api/purchase-intents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          // keep your existing payload shape
          amountUsdc,
          refCode: refCode || null,
          walletAddress: walletAddress || null,
          landingPath: firstTouch?.landingPath || "/buy",
          referrer: firstTouch?.referrer || document.referrer || null,
          utm: {
            source: firstTouch?.source ?? null,
            medium: firstTouch?.medium ?? null,
            campaign: firstTouch?.campaign ?? null,
            content: firstTouch?.content ?? null,
            term: firstTouch?.term ?? null,
          },
          lastTouch: {
            refCode: refCode || null,
            source: lastTouch?.source ?? null,
            medium: lastTouch?.medium ?? null,
            campaign: lastTouch?.campaign ?? null,
            content: lastTouch?.content ?? null,
            term: lastTouch?.term ?? null,
            landingPath: lastTouch?.landingPath ?? null,
            referrer: lastTouch?.referrer ?? null,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to create purchase intent");

      setIntent(data.intent);
      setStatusIntentId(data.intent.id);
      setVerifyMsg(null);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    setStatusLoading(true);
    setStatusError(null);
    setStatusData(null);

    try {
      const id = statusIntentId.trim();
      if (!id) throw new Error("Enter an intent ID");

      const res = await fetch(`/api/purchase-intents/${id}/status`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to fetch status");

      setStatusData(data.intent);
    } catch (e: any) {
      setStatusError(e?.message || "Status check failed");
    } finally {
      setStatusLoading(false);
    }
  }

  async function verifyOnChain() {
    setVerifyLoading(true);
    setVerifyMsg(null);
    try {
      const id = statusIntentId.trim();
      if (!id) throw new Error("Enter an intent ID first");

      const res = await fetch(`/api/purchase-intents/${id}/verify`, { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Verification failed");
      }

      if (data.matched) {
        setVerifyMsg("✅ Payment matched on-chain and marked confirmed.");
      } else if (data.alreadyConfirmed) {
        setVerifyMsg("✅ Intent already confirmed.");
      } else {
        setVerifyMsg("⏳ No exact confirmed transfer found yet. Try again in a bit.");
      }

      await checkStatus();
    } catch (e: any) {
      setVerifyMsg(`❌ ${e?.message || "Verify failed"}`);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${label} copied`);
    } catch {
      alert(`Could not copy ${label}`);
    }
  }

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Buy SKOpi (USDC)</h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        Create an intent, pay exact USDC on Solana, then check/verify status.
      </p>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>1) Create Purchase Intent</h2>
        <label style={{ display: "block", marginBottom: 8 }}>Amount (USDC)</label>
        <input
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", marginBottom: 12 }}
        />

        <label style={{ display: "block", marginBottom: 8 }}>Wallet Address (optional for now)</label>
        <input
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Solana wallet address"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", marginBottom: 12 }}
        />

        <button
          onClick={createIntent}
          disabled={loading}
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #333", cursor: "pointer" }}
        >
          {loading ? "Creating..." : "Create Intent"}
        </button>

        {error && <div style={{ marginTop: 12, color: "crimson" }}>{error}</div>}

        {intent && (
          <div style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
            <div><strong>Intent ID:</strong> <code>{intent.id}</code> <button onClick={() => copyText(intent.id, "Intent ID")}>Copy</button></div>
            <div><strong>Status:</strong> {intent.status}</div>
            <div><strong>USDC:</strong> {humanUsdc(intent.amount_usdc_atomic)}</div>
            <div><strong>Solana Pay:</strong> <a href={payUrl}>{payUrl}</a></div>
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>2) Check Status</h2>
        <input
          value={statusIntentId}
          onChange={(e) => setStatusIntentId(e.target.value)}
          placeholder="Intent ID"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", marginBottom: 12 }}
        />
        <button
          onClick={checkStatus}
          disabled={statusLoading}
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #333", cursor: "pointer" }}
        >
          {statusLoading ? "Checking..." : "Check Status"}
        </button>

        {statusError && <div style={{ marginTop: 12, color: "crimson" }}>{statusError}</div>}
        {statusData && (
          <div style={{ marginTop: 12 }}>
            <div><strong>Status:</strong> {statusData.status}</div>
            <div><strong>Tx Signature:</strong> {statusData.tx_signature || "Not confirmed yet"}</div>
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>3) Verify On-Chain Payment</h2>
        <button
          onClick={verifyOnChain}
          disabled={verifyLoading}
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #333", cursor: "pointer" }}
        >
          {verifyLoading ? "Verifying..." : "Verify On-Chain Payment"}
        </button>
        {verifyMsg && <div style={{ marginTop: 12 }}>{verifyMsg}</div>}
      </div>
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";

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

      const firstTouch = readTouch("skopi_first_touch");
      const lastTouch = readTouch("skopi_last_touch");

      const res = await fetch("/api/purchase-intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsdc,
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
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Your Solana wallet address"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", marginBottom: 12 }}
        />

        <button
          onClick={createIntent}
          disabled={loading}
          style={{ padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "#111", color: "#fff" }}
        >
          {loading ? "Creating..." : "Create Purchase Intent"}
        </button>
      </div>

      {error && (
        <div style={{ border: "1px solid #f5b5b5", background: "#fff5f5", color: "#8a1c1c", borderRadius: 12, padding: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {intent && (
        <div style={{ border: "1px solid #cce7d0", background: "#f3fff5", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0 }}>2) Pay with Wallet ✅</h2>
          <p><strong>Intent ID:</strong> {intent.id}</p>
          <p><strong>Status:</strong> {intent.status}</p>
          <p><strong>Amount:</strong> {humanUsdc(intent.amount_usdc_atomic)} USDC</p>
          <p><strong>Treasury:</strong> {intent.treasury_address}</p>
          <p><strong>Reference:</strong> {intent.reference_pubkey}</p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button onClick={() => copyText(intent.treasury_address, "Treasury address")}>Copy Treasury</button>
            <button onClick={() => copyText(intent.reference_pubkey, "Reference")}>Copy Reference</button>
            <button onClick={() => copyText(payUrl, "Payment URL")}>Copy Payment URL</button>
            <a href={payUrl} style={{ padding: "6px 10px", border: "1px solid #222", borderRadius: 6, textDecoration: "none" }}>
              Open in Wallet
            </a>
          </div>

          <p style={{ marginTop: 12, marginBottom: 10 }}>
            <a href={`/receipt/${intent.id}`} style={{ textDecoration: "underline" }}>
              Open Receipt Page
            </a>
          </p>

          <p style={{ marginTop: 0, marginBottom: 0 }}>
            ⚠️ Send the <strong>exact USDC amount</strong> with this reference.
          </p>
        </div>
      )}

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>3) Check Payment Status</h2>

        <label style={{ display: "block", marginBottom: 8 }}>Intent ID</label>
        <input
          type="text"
          value={statusIntentId}
          onChange={(e) => setStatusIntentId(e.target.value)}
          placeholder="Paste intent ID"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", marginBottom: 12 }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={checkStatus}
            disabled={statusLoading}
            style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #222", cursor: "pointer", background: "#fff" }}
          >
            {statusLoading ? "Checking..." : "Check Status"}
          </button>

          <button
            onClick={verifyOnChain}
            disabled={verifyLoading}
            style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #222", cursor: "pointer", background: "#111", color: "#fff" }}
          >
            {verifyLoading ? "Verifying..." : "Verify On-Chain Payment"}
          </button>
        </div>

        {verifyMsg && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#f7f7f7" }}>
            {verifyMsg}
          </div>
        )}

        {statusError && (
          <div style={{ border: "1px solid #f5b5b5", background: "#fff5f5", color: "#8a1c1c", borderRadius: 12, padding: 12, marginTop: 12 }}>
            {statusError}
          </div>
        )}

        {statusData && (
          <div style={{ border: "1px solid #cce7d0", background: "#f3fff5", borderRadius: 12, padding: 12, marginTop: 12 }}>
            <p><strong>Status:</strong> {statusData.status}</p>
            <p><strong>Intent ID:</strong> {statusData.id}</p>
            <p><strong>Amount:</strong> {humanUsdc(statusData.amount_usdc_atomic)} USDC</p>
            <p><strong>Reference:</strong> {statusData.reference_pubkey}</p>
            <p><strong>Tx Signature:</strong> {statusData.tx_signature || "Not confirmed yet"}</p>
          </div>
        )}
      </div>
    </main>
  );
}

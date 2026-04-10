"use client";

import { useEffect, useMemo, useState } from "react";

type LocalPhantomProvider = {
  isPhantom?: boolean;
  connect: (opts?: any) => Promise<{ publicKey?: { toBase58: () => string } }>;
  publicKey?: { toBase58: () => string };
  on?: (event: string, cb: (...args: any[]) => void) => void;
  off?: (event: string, cb: (...args: any[]) => void) => void;
};

function shortAddr(v: string) {
  if (!v) return "";
  return `${v.slice(0, 4)}...${v.slice(-4)}`;
}

function getProvider(): LocalPhantomProvider | undefined {
  return (window as any)?.solana as LocalPhantomProvider | undefined;
}

export default function WalletStatusBadge({ compact = false }: { compact?: boolean }) {
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPhantom, setHasPhantom] = useState(false);
  const [msg, setMsg] = useState("");

  const connected = !!wallet;

  useEffect(() => {
    const provider = getProvider();
    setHasPhantom(!!provider?.isPhantom);

    const syncWallet = () => {
      const pk = provider?.publicKey?.toBase58?.() || "";
      setWallet(pk);
    };

    syncWallet();

    const onConnect = () => syncWallet();
    const onDisconnect = () => {
      setWallet("");
      setMsg("");
    };
    const onAccountChanged = (pk?: { toBase58?: () => string } | null) => {
      setWallet(pk?.toBase58?.() || "");
    };

    provider?.on?.("connect", onConnect);
    provider?.on?.("disconnect", onDisconnect);
    provider?.on?.("accountChanged", onAccountChanged as any);

    return () => {
      provider?.off?.("connect", onConnect);
      provider?.off?.("disconnect", onDisconnect);
      provider?.off?.("accountChanged", onAccountChanged as any);
    };
  }, []);

  const statusText = useMemo(() => {
    if (connected) return `Connected: ${shortAddr(wallet)}`;
    if (!hasPhantom) return "Phantom not detected";
    return "Wallet not connected";
  }, [connected, wallet, hasPhantom]);

  async function handleConnect() {
    setMsg("");
    try {
      const provider = getProvider();
      if (!provider?.isPhantom) {
        setMsg("Install Phantom first.");
        return;
      }
      setLoading(true);
      const res = await provider.connect();
      const w = res?.publicKey?.toBase58?.() || provider.publicKey?.toBase58?.() || "";
      if (!w) {
        setMsg("Could not read wallet address.");
        return;
      }
      setWallet(w);
    } catch (e: any) {
      setMsg(e?.message || "Wallet connect failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,.10)",
        borderRadius: 16,
        padding: compact ? 12 : 16,
        background: "rgba(255,255,255,.02)",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            border: connected
              ? "1px solid rgba(34,197,94,.45)"
              : "1px solid rgba(212,175,55,.35)",
            background: connected
              ? "rgba(34,197,94,.12)"
              : "rgba(212,175,55,.10)",
            color: connected ? "#86efac" : "#f3d36b",
          }}
        >
          {connected ? "Wallet Connected" : "Connect Wallet"}
        </div>

        <div style={{ fontSize: compact ? 13 : 14, opacity: 0.9, wordBreak: "break-all" }}>
          {statusText}
        </div>
      </div>

      {connected ? (
        <div style={{ fontSize: 12, opacity: 0.72, fontFamily: "monospace" }}>{wallet}</div>
      ) : null}

      {!connected ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={handleConnect}
            disabled={loading}
            style={{
              border: "1px solid rgba(212,175,55,.45)",
              background: "rgba(212,175,55,.14)",
              color: "#f3d36b",
              borderRadius: 12,
              padding: "10px 14px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {loading ? "Connecting..." : "Connect Phantom"}
          </button>

          {!hasPhantom ? (
            <a
              href="https://phantom.app/"
              target="_blank"
              rel="noreferrer"
              style={{
                border: "1px solid rgba(255,255,255,.12)",
                color: "inherit",
                textDecoration: "none",
                borderRadius: 12,
                padding: "10px 14px",
                fontWeight: 700,
              }}
            >
              Install Phantom
            </a>
          ) : null}
        </div>
      ) : null}

      {msg ? (
        <div style={{ fontSize: 13, color: "#fca5a5", fontWeight: 700 }}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}

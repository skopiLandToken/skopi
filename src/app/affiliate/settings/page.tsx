"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function AffiliateSettingsPage() {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);

      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) {
        setMsg("You must be logged in to set your payout wallet.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("marketing_partners")
        .select("payout_wallet_address")
        .eq("user_id", user.id)
        .single();

      if (error) setMsg(error.message);
      if (data?.payout_wallet_address) setWallet(data.payout_wallet_address);

      setLoading(false);
    })();
  }, [supabase]);

  async function save() {
    setMsg(null);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      setMsg("Not logged in.");
      return;
    }

    const trimmed = wallet.trim();
    if (trimmed.length && (trimmed.length < 32 || trimmed.length > 60)) {
      setMsg("Wallet address length looks wrong. Please paste a valid Solana address.");
      return;
    }

    const { error } = await supabase
      .from("marketing_partners")
      .update({ payout_wallet_address: trimmed || null })
      .eq("user_id", user.id);

    if (error) setMsg(error.message);
    else setMsg("Saved.");
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Affiliate Settings</h1>
      <p style={{ opacity: 0.8, marginBottom: 20 }}>
        Set the Solana wallet address where you want to receive USDC affiliate payouts.
      </p>

      <label style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>
        Payout Wallet Address
      </label>
      <input
        value={wallet}
        onChange={(e) => setWallet(e.target.value)}
        placeholder="Paste Solana address (e.g., ...)"
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(0,0,0,0.2)",
          color: "white",
        }}
        disabled={loading}
      />

      <div style={{ marginTop: 14 }}>
        <button
          onClick={save}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.08)",
            color: "white",
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </div>

      {msg && <div style={{ marginTop: 14, opacity: 0.9 }}>{msg}</div>}
    </div>
  );
}

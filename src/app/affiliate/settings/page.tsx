"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export default function AffiliateSettingsPage() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      setMsg(
        "Missing Supabase public env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
      );
      setLoading(false);
      return;
    }

    const client = createClient(url, anon);
    setSupabase(client);

    (async () => {
      setLoading(true);
      setMsg(null);

      const { data: userRes } = await client.auth.getUser();
      const user = userRes?.user;
      if (!user) {
        setMsg("You must be logged in to set your payout wallet.");
        setLoading(false);
        return;
      }

      const { data, error } = await client
        .from("marketing_partners")
        .select("payout_wallet_address")
        .eq("user_id", user.id)
        .single();

      if (error) setMsg(error.message);
      if (data?.payout_wallet_address) setWallet(data.payout_wallet_address);

      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!supabase) return;
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
        placeholder="Paste Solana address"
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #333" }}
        disabled={loading}
      />

      <div style={{ marginTop: 14 }}>
        <button
          onClick={save}
          disabled={loading || !supabase}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333", cursor: "pointer" }}
        >
          Save
        </button>
      </div>

      {msg && <div style={{ marginTop: 14 }}>{msg}</div>}
    </div>
  );
}

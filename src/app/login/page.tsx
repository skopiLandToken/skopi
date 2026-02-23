"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }
    window.location.href = "/affiliate";
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }
    setMsg("Signup success. Now sign in.");
    setLoading(false);
  }

  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Login</h1>
      <p style={{ marginTop: 8, opacity: 0.85 }}>Sign in to access your affiliate dashboard.</p>

      <form onSubmit={signIn} style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc" }}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 12, borderRadius: 12, border: "1px solid #111", cursor: "pointer" }}
        >
          {loading ? "…" : "Sign In"}
        </button>

        <button
          type="button"
          onClick={signUp}
          disabled={loading}
          style={{ padding: 12, borderRadius: 12, border: "1px solid #111", cursor: "pointer", opacity: 0.9 }}
        >
          {loading ? "…" : "Sign Up"}
        </button>
      </form>

      {msg ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid #eee", background: "#fafafa" }}>
          {msg}
        </div>
      ) : null}
    </main>
  );
}

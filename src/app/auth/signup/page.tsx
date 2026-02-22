"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = sp.get("ref");
    if (ref) localStorage.setItem("skopi_ref", ref.trim().toUpperCase());
  }, [sp]);

  async function signup(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const supabase = supabaseBrowser();
    const ref = (localStorage.getItem("skopi_ref") || "").trim().toUpperCase() || null;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { ref },
      },
    });

    setLoading(false);
    if (error) setMsg(error.message);
    else setMsg("Check your email for the login link.");
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Create your SKOpi account</h1>
      <p style={{ opacity: 0.85, marginBottom: 16 }}>We’ll email you a secure sign-in link.</p>

      <form onSubmit={signup} style={{ display: "grid", gap: 12 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          type="email"
          required
          style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #333" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #333", cursor: "pointer" }}
        >
          {loading ? "Sending…" : "Send login link"}
        </button>
      </form>

      {msg && <div style={{ marginTop: 14 }}>{msg}</div>}

      <div style={{ marginTop: 18, opacity: 0.85 }}>
        Already have an account? <a href="/auth/login">Log in</a>
      </div>
    </div>
  );
}

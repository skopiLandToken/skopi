from pathlib import Path

TARGET = Path("src/app/auth/login/page.tsx")

TSX = r"""'use client';

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    // Hard refresh to ensure server-rendered pages see the session cookie
    window.location.href = "/sale";
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Log in</h1>
      <p style={{ opacity: 0.85, marginBottom: 16 }}>
        Log in with your email + password.
      </p>

      <form onSubmit={login} style={{ display: "grid", gap: 12 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          type="email"
          autoComplete="email"
          required
          style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #333" }}
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          autoComplete="current-password"
          required
          style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #333" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #333", cursor: "pointer" }}
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      {msg && <div style={{ marginTop: 14 }}>{msg}</div>}

      <div style={{ marginTop: 18, opacity: 0.85 }}>
        Need an account? <a href="/auth/signup">Sign up</a>
      </div>
    </div>
  );
}
"""

def main():
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(TSX, encoding="utf-8")
    print(f"✅ Overwrote {TARGET}")

if __name__ == "__main__":
    main()

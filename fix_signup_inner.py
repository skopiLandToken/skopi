from pathlib import Path

TARGET = Path("src/app/auth/signup/signup-inner.tsx")

TSX = r""""use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function SignupInner() {
  const sp = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    const ref =
      (localStorage.getItem("skopi_ref") || "").trim().toUpperCase() || null;

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { ref },
      },
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    // With email confirmations OFF (recommended while rate-limited),
    // the user can log in immediately with email+password.
    setMsg("Account created. You can now log in with your email + password.");
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
        Create your SKOpi account
      </h1>
      <p style={{ opacity: 0.85, marginBottom: 16 }}>
        Create an account with email + password.
      </p>

      <form onSubmit={signup} style={{ display: "grid", gap: 12 }}>
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
          autoComplete="new-password"
          required
          style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #333" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #333",
            cursor: "pointer",
          }}
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      {msg && <div style={{ marginTop: 14 }}>{msg}</div>}

      <div style={{ marginTop: 18, opacity: 0.85 }}>
        Already have an account? <a href="/auth/login">Log in</a>
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

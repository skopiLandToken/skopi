"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Container, Card, Button, Pill } from "../components/ui";

function getNextParam() {
  if (typeof window === "undefined") return "/me/purchases";
  const u = new URL(window.location.href);
  return u.searchParams.get("next") || "/me/purchases";
}

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const nextUrl = useMemo(() => getNextParam(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }
    window.location.href = nextUrl;
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
    setMsg("Signup success. Now sign in, or use Magic Link.");
    setLoading(false);
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${nextUrl}`,
      },
    });

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    setMsg("Magic link sent. Check your email.");
    setLoading(false);
  }

  return (
    <Container>
      <div style={{ display: "grid", gap: 14, maxWidth: 560 }}>
        <div>
          <h1 style={{ margin: 0 }}>Login</h1>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Sign in to access your purchases and affiliate dashboard.
          </div>
          <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
            After login you’ll return to: <span style={{ fontFamily: "monospace" }}>{nextUrl}</span>
          </div>
        </div>

        <Card title="Magic Link" subtitle="Fastest option (no password needed)">
          <form onSubmit={magicLink} style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, opacity: 0.9 }}>
              Email
              <input
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc" }}
                autoComplete="email"
              />
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <Button type="submit" disabled={loading || !email}>
                {loading ? "…" : "Send Magic Link"}
              </Button>
              <Button href="/sale" variant="secondary">Back to Sale</Button>
            </div>
          </form>
        </Card>

        <Card title="Password Login" subtitle="Works too (email + password)">
          <form onSubmit={signInPassword} style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, opacity: 0.9 }}>
              Email
              <input
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc" }}
                autoComplete="email"
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 13, opacity: 0.9 }}>
              Password
              <input
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc" }}
                autoComplete="current-password"
              />
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <Button type="submit" disabled={loading || !email || !password}>
                {loading ? "…" : "Sign In"}
              </Button>
              <Button variant="secondary" onClick={signUp} disabled={loading || !email || !password}>
                {loading ? "…" : "Sign Up"}
              </Button>
            </div>
          </form>

          {msg ? (
            <div style={{ marginTop: 12 }}>
              <Pill text={msg} />
            </div>
          ) : null}
        </Card>

        <Card title="Quick links" subtitle="Browse first">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button href="/" variant="secondary">Home</Button>
            <Button href="/sale" variant="secondary">Sale</Button>
          </div>
        </Card>
      </div>
    </Container>
  );
}

"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Container, Card, Button, Pill } from "../components/ui";

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
    window.location.href = "/me/purchases";
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
    <Container>
      <div style={{ display: "grid", gap: 14, maxWidth: 560 }}>
        <div>
          <h1 style={{ margin: 0 }}>Login</h1>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Sign in to access your purchases and affiliate dashboard.
          </div>
        </div>

        <Card title="Account" subtitle="Use email + password">
          <form onSubmit={signIn} style={{ display: "grid", gap: 10 }}>
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
              <Button type="submit" disabled={loading}>
                {loading ? "…" : "Sign In"}
              </Button>

              <Button variant="secondary" onClick={() => {}} disabled={true} title="Use Sign Up button below">
                Email Link (soon)
              </Button>

              <Button variant="secondary" onClick={signUp} disabled={loading}>
                {loading ? "…" : "Sign Up"}
              </Button>
            </div>
          </form>

          {msg ? (
            <div style={{ marginTop: 12 }}>
              <Pill text={msg} />
            </div>
          ) : null}

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
            Tip: after signing in, you’ll land on <b>My Purchases</b>.
          </div>
        </Card>

        <Card title="Quick links" subtitle="If you just want to browse first">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button href="/sale" variant="secondary">Sale</Button>
            <Button href="/" variant="secondary">Home</Button>
          </div>
        </Card>
      </div>
    </Container>
  );
}

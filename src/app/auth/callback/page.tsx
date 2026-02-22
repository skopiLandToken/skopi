"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Completing sign-in…");

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setMsg("Signed in. Redirecting…");
        window.location.href = "/buy";
        return;
      }

      setMsg("If you’re not redirected, go to /buy.");
      setTimeout(() => (window.location.href = "/buy"), 800);
    })();
  }, []);

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>SKOpi</h1>
      <p style={{ marginTop: 10 }}>{msg}</p>
    </div>
  );
}

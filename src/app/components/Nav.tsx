import { supabaseServer } from "@/lib/supabase-server";

function isAdminEmail(email: string | null | undefined) {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!email) return false;
  if (allow.length === 0) return false; // fail-closed
  return allow.includes(email.toLowerCase());
}

export default async function Nav() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const email = data?.user?.email || null;

  const isAdmin = isAdminEmail(email);

  const linkStyle: React.CSSProperties = {
    textDecoration: "none",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #ddd",
    fontSize: 14,
    color: "#111",
  };

  return (
    <header style={{ borderBottom: "1px solid #eee", background: "#fff" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>
          <a href="/" style={{ textDecoration: "none", color: "#111" }}>SKOpi</a>
        </div>

        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/sale" style={linkStyle}>Sale</a>

          {email ? (
            <>
              <a href="/affiliate" style={linkStyle}>Affiliate</a>
              <a href="/me/purchases" style={linkStyle}>My Purchases</a>

              {isAdmin ? (
                <>
                  <a href="/admin/intents" style={linkStyle}>Admin Intents</a>
                  <a href="/admin/commissions" style={linkStyle}>Admin Commissions</a>
                  <a href="/admin/payouts" style={linkStyle}>Admin Payouts</a>
                </>
              ) : null}

              <a href="/logout" style={linkStyle}>Logout</a>
            </>
          ) : (
            <a href="/login" style={linkStyle}>Login</a>
          )}
        </nav>
      </div>
    </header>
  );
}

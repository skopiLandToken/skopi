import { supabaseServer } from "@/lib/supabase-server";
import { Button } from "./ui";

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

  return (
    <header>
      <div
        className="container"
        style={{
          paddingTop: 14,
          paddingBottom: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>
          <a href="/" style={{ textDecoration: "none" }}>SKOpi</a>
        </div>

        <nav style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Button href="/sale" variant="secondary">Sale</Button>

          {email ? (
            <>
              <Button href="/affiliate" variant="secondary">Affiliate</Button>
              <Button href="/me/purchases" variant="secondary">My Purchases</Button>

              {isAdmin ? (
                <>
                  <Button href="/admin/status" variant="ghost">Admin</Button>
                  <Button href="/admin/intents" variant="ghost">Intents</Button>
                  <Button href="/admin/commissions" variant="ghost">Commissions</Button>
                  <Button href="/admin/payouts" variant="ghost">Payouts</Button>
                </>
              ) : null}

              <Button href="/logout" variant="primary">Logout</Button>
            </>
          ) : (
            <Button href="/login" variant="primary">Login</Button>
          )}
        </nav>
      </div>
    </header>
  );
}

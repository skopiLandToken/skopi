import { supabaseServer } from "@/lib/supabase-server";
import { headers } from "next/headers";
import { Button } from "./ui";

function isAdminEmail(email: string | null | undefined) {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!email) return false;
  if (allow.length === 0) return false;
  return allow.includes(email.toLowerCase());
}

function rawToNumber(raw: string, decimals: number) {
  return Number(raw) / Math.pow(10, decimals);
}

function fmtCompact(raw: string, decimals: number) {
  const n = rawToNumber(raw, decimals);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtPercent(raw: string, totalRaw: string) {
  const rawNum = Number(raw);
  const totalNum = Number(totalRaw);
  if (!totalNum) return "0%";
  const pct = (rawNum / totalNum) * 100;

  const two = pct.toFixed(2);
  if ((two === "100.00" && pct < 100) || (two === "0.00" && pct > 0)) {
    return `${pct.toFixed(4)}%`;
  }

  return `${two}%`;
}

async function getProofForNav() {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "app.skopi.io";
    const proto = h.get("x-forwarded-proto") ?? "https";
    const baseUrl = `${proto}://${host}`;

    const res = await fetch(`${baseUrl}/api/token-proof`, {
      cache: "no-store",
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Nav proof fetch error:", e);
    return null;
  }
}

function StatPill({
  label,
  value,
  percent,
  tone = "cyan",
}: {
  label: string;
  value: string;
  percent?: string;
  tone?: "cyan" | "gold";
}) {
  const styles =
    tone === "gold"
      ? {
          border: "1px solid rgba(212, 175, 55, 0.40)",
          background: "rgba(212, 175, 55, 0.14)",
          color: "#f3d36b",
        }
      : {
          border: "1px solid rgba(34, 211, 238, 0.35)",
          background: "rgba(34, 211, 238, 0.12)",
          color: "#9be7f3",
        };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "7px 10px",
        borderRadius: 12,
        minWidth: 132,
        ...styles,
      }}
      title={percent ? `${label}: ${value} (${percent})` : `${label}: ${value}`}
    >
      <span style={{ fontSize: 11, opacity: 0.9, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.1 }}>{value}</span>
      {percent ? <span style={{ fontSize: 11, opacity: 0.88 }}>{percent} left</span> : null}
    </div>
  );
}

export default async function Nav() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const email = data?.user?.email || null;
  const isAdmin = isAdminEmail(email);

  const proof = await getProofForNav();
  const decimals = proof?.decimals ?? 6;

  const saleRaw = proof?.accounts?.saleAta?.amountRaw ?? "0";
  const commRaw = proof?.accounts?.commAta?.amountRaw ?? "0";

  const saleLeft = proof ? fmtCompact(saleRaw, decimals) : "Unavailable";
  const airdropLeft = proof ? fmtCompact(commRaw, decimals) : "Unavailable";

  const salePct = proof ? fmtPercent(saleRaw, "200000000000000") : undefined;
  const airdropPct = proof ? fmtPercent(commRaw, "100000000000000") : undefined;

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
          <Button href="/sale" variant="brand">Buy SKOpi Now</Button>
          <Button href="/token-proof" variant="secondary">Token Proof</Button>
          <Button href="/airdrop" variant="secondary">Airdrop</Button>

          <StatPill label="Pub Sale Left" value={saleLeft} percent={salePct} tone="cyan" />
          <StatPill label="Airdrop Bonus Left" value={airdropLeft} percent={airdropPct} tone="gold" />

          {email ? (
            <>
              <Button href="/marketing-partners" variant="secondary">Marketing Partner</Button>
              <Button href="/me/purchases" variant="secondary">My Purchases</Button>

              {isAdmin ? (
                <>
                  <Button href="/admin/status" variant="ghost">Admin</Button>
                  <Button href="/admin/intents" variant="ghost">Intents</Button>
                  <Button href="/admin/commissions" variant="ghost">Commissions</Button>
                  <Button href="/admin/payouts" variant="ghost">Payouts</Button>
                </>
              ) : null}

              <a
                href="/profile"
                style={{
                  textDecoration: "none",
                  padding: "9px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(212, 175, 55, 0.45)",
                  background: "rgba(212, 175, 55, 0.14)",
                  color: "#f3d36b",
                  fontSize: 13,
                  fontWeight: 700,
                  maxWidth: 220,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={email}
              >
                {email}
              </a>

              <Button href="/logout" variant="primary">Logout</Button>
            </>
          ) : (
            <>
              <Button href="/login" variant="secondary">Login</Button>
              <Button href="/auth/signup" variant="primary">Sign Up</Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

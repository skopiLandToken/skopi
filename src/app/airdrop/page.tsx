import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type AirdropLeaderboardRow = {
  wallet_address: string;
  total_tokens: number;
  claimable_tokens: number;
  locked_tokens: number;
  status: string;
  created_at: string;
};

function formatTokens(value: number | string | null | undefined) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function shortWallet(value: string | null | undefined) {
  if (!value) return "—";
  if (value.length <= 12) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export default async function AirdropPage() {
  const supabase = await supabaseServer();
  const { data: leaderboardRes } = await supabase.rpc("get_airdrop_leaderboard");
  const leaderboard = (leaderboardRes ?? []) as AirdropLeaderboardRow[];

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <div
        style={{
          border: "1px solid rgba(255,255,255,.10)",
          borderRadius: 20,
          padding: 24,
          background: "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02))",
          boxShadow: "0 10px 28px rgba(0,0,0,.30)",
        }}
      >
        <div
          style={{
            display: "inline-block",
            marginBottom: 12,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(212, 175, 55, 0.40)",
            background: "rgba(212, 175, 55, 0.14)",
            color: "#f3d36b",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          SKOpi Community Bonus Program
        </div>

        <h1 style={{ fontSize: 36, lineHeight: 1.1, margin: "0 0 10px 0", fontWeight: 800 }}>
          SKOpi Airdrop
        </h1>

        <p style={{ fontSize: 16, opacity: 0.88, maxWidth: 760, marginBottom: 24 }}>
          Verified bonus campaigns are not live yet. This page will be used for future SKOpi
          community reward tasks, partner promotions, and approved airdrop bonus opportunities.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <section
            style={{
              border: "1px solid rgba(255,255,255,.10)",
              borderRadius: 16,
              padding: 18,
              background: "rgba(255,255,255,.02)",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>Status</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>Not Live Yet</div>
          </section>

          <section
            style={{
              border: "1px solid rgba(255,255,255,.10)",
              borderRadius: 16,
              padding: 18,
              background: "rgba(255,255,255,.02)",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>Campaigns</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>0 Active</div>
          </section>

          <section
            style={{
              border: "1px solid rgba(255,255,255,.10)",
              borderRadius: 16,
              padding: 18,
              background: "rgba(255,255,255,.02)",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>Leaderboard Entries</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{leaderboard.length}</div>
          </section>
        </div>

        <div
          style={{
            border: "1px solid rgba(34, 211, 238, 0.20)",
            borderRadius: 16,
            padding: 18,
            background: "rgba(34, 211, 238, 0.06)",
            marginBottom: 18,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>What this page will be used for</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, opacity: 0.9 }}>
            <li>approved community bonus campaigns</li>
            <li>referral and promo reward tasks</li>
            <li>verified wallet submissions</li>
            <li>future hourly / daily reward tracking</li>
          </ul>
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,.10)",
            borderRadius: 16,
            padding: 18,
            background: "rgba(255,255,255,.02)",
            marginTop: 24,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 20 }}>
            Airdrop Leaderboard
          </div>

          {leaderboard.length === 0 ? (
            <p style={{ margin: 0, opacity: 0.7 }}>
              No airdrop allocations yet. Once real campaigns begin, this leaderboard will show the
              top wallet allocations.
            </p>
          ) : (
            <div
              style={{
                border: "1px solid rgba(255,255,255,.10)",
                borderRadius: 14,
                overflow: "hidden",
                background: "rgba(255,255,255,.03)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1.2fr 1fr 1fr 1fr 120px 140px",
                  background: "rgba(255,255,255,.04)",
                  borderBottom: "1px solid rgba(255,255,255,.08)",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                <div style={{ padding: 12 }}>Rank</div>
                <div style={{ padding: 12 }}>Wallet</div>
                <div style={{ padding: 12 }}>Total</div>
                <div style={{ padding: 12 }}>Claimable</div>
                <div style={{ padding: 12 }}>Locked</div>
                <div style={{ padding: 12 }}>Status</div>
                <div style={{ padding: 12 }}>Created</div>
              </div>

              {leaderboard.map((row, idx) => (
                <div
                  key={`${row.wallet_address}-${idx}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1.2fr 1fr 1fr 1fr 120px 140px",
                    borderTop: idx === 0 ? "none" : "1px solid rgba(255,255,255,.08)",
                  }}
                >
                  <div style={{ padding: 12 }}>{idx + 1}</div>
                  <div style={{ padding: 12, fontFamily: "monospace" }}>{shortWallet(row.wallet_address)}</div>
                  <div style={{ padding: 12 }}>{formatTokens(row.total_tokens)}</div>
                  <div style={{ padding: 12 }}>{formatTokens(row.claimable_tokens)}</div>
                  <div style={{ padding: 12 }}>{formatTokens(row.locked_tokens)}</div>
                  <div style={{ padding: 12 }}>{row.status || "—"}</div>
                  <div style={{ padding: 12 }}>{formatDate(row.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p style={{ marginTop: 18, marginBottom: 0, opacity: 0.7 }}>
          Once the first real campaign is launched, this page will show active tasks, bonus amounts,
          submission rules, live remaining allocation, and the current leaderboard.
        </p>
      </div>
    </main>
  );
}

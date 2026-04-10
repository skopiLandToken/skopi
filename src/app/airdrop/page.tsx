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

type ActiveCampaignRow = {
  id: string;
  name: string;
  description: string | null;
  details: string | null;
  status: string;
  start_at: string | null;
  end_at: string | null;
  pool_tokens: number;
  per_user_cap: number;
  max_claims: number | null;
  distributed_tokens: number;
  video_url: string | null;
  claimed_count: number;
  remaining_spots: number;
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

  const [{ data: leaderboardRes }, { data: campaignRes }] = await Promise.all([
    supabase.rpc("get_airdrop_leaderboard"),
    supabase.rpc("get_active_airdrop_campaign_summary"),
  ]);

  const leaderboard = (leaderboardRes ?? []) as AirdropLeaderboardRow[];
  const activeCampaign = ((campaignRes ?? [])[0] ?? null) as ActiveCampaignRow | null;

  const rewardSkopi = Number(activeCampaign?.per_user_cap || 0);
  const salePricePerToken = 0.10;
  const rewardUsdc = rewardSkopi * salePricePerToken;

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
          SKOpi Community Bonus Rewards
        </div>

        <h1 style={{ fontSize: 36, lineHeight: 1.1, margin: "0 0 10px 0", fontWeight: 800 }}>
          SKOpi Community Bonus Rewards
        </h1>

        <p style={{ fontSize: 16, opacity: 0.88, maxWidth: 760, marginBottom: 24 }}>
          This page is used for SKOpi community reward campaigns, signup bonuses,
          partner promotions, approved airdrop opportunities, and reward tracking.
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
            <div style={{ fontSize: 24, fontWeight: 800 }}>
              {activeCampaign ? activeCampaign.status : "No Active Campaign"}
            </div>
          </section>

          <section
            style={{
              border: "1px solid rgba(255,255,255,.10)",
              borderRadius: 16,
              padding: 18,
              background: "rgba(255,255,255,.02)",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>Active Campaigns</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{activeCampaign ? 1 : 0}</div>
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

        {activeCampaign ? (
          <div
            style={{
              border: "1px solid rgba(212, 175, 55, 0.24)",
              borderRadius: 16,
              padding: 18,
              background: "rgba(212, 175, 55, 0.08)",
              marginBottom: 18,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 20 }}>
              {activeCampaign.name}
            </div>

            <div style={{ marginBottom: 14, opacity: 0.88 }}>
              {activeCampaign.description || "Active SKOpi bonus campaign."}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Reward</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{formatTokens(rewardSkopi)} SKOPI</div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Est. USDC Value</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>${rewardUsdc.toFixed(2)}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Claimed / Joined</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  {activeCampaign.claimed_count} / {activeCampaign.max_claims ?? "—"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Remaining</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{activeCampaign.remaining_spots}</div>
              </div>
            </div>

            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: "pointer", fontWeight: 800 }}>
                Campaign details
              </summary>
              <div style={{ marginTop: 12, lineHeight: 1.7, opacity: 0.9 }}>
                {activeCampaign.details || "No additional campaign details yet."}
                <div style={{ marginTop: 10 }}>
                  Start: {formatDate(activeCampaign.start_at)} • End: {formatDate(activeCampaign.end_at)}
                </div>
              </div>
            </details>
          </div>
        ) : null}

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
            <li>campaign reward estimates in USDC value</li>
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
      </div>
    </main>
  );
}

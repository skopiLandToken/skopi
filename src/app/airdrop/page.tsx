import { supabaseServer } from "@/lib/supabase-server";
import { Pill } from "../components/ui";
import CampaignVideoModal from "../components/campaign-video-modal";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const DEFAULT_CAMPAIGN_VIDEO = "https://www.youtube.com/embed/dQw4w9WgXcQ";

type CampaignRow = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
  lock_days: number | null;
  pool_tokens: number | null;
  per_user_cap: number | null;
  max_claims: number | null;
  video_url: string | null;
  details: string | null;
};

type CampaignStatsRow = {
  id: string;
  name: string;
  max_claims: number | null;
  pool_tokens: number | null;
  per_user_cap: number | null;
  distributed_tokens: number | null;
  allocation_rows: number;
  submission_rows: number;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function embedUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.includes("youtube.com/embed/")) return url;
  return url;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function getTheme(idx: number) {
  const cardThemes = [
    {
      border: "1px solid rgba(34,211,238,.22)",
      background: "rgba(14, 44, 56, 0.92)",
      pillBorder: "1px solid rgba(34,211,238,.35)",
      pillBg: "rgba(34,211,238,.12)",
    },
    {
      border: "1px solid rgba(212,175,55,.24)",
      background: "rgba(44, 38, 18, 0.92)",
      pillBorder: "1px solid rgba(212,175,55,.35)",
      pillBg: "rgba(212,175,55,.12)",
    },
    {
      border: "1px solid rgba(168,85,247,.24)",
      background: "rgba(32, 20, 48, 0.92)",
      pillBorder: "1px solid rgba(168,85,247,.35)",
      pillBg: "rgba(168,85,247,.12)",
    },
    {
      border: "1px solid rgba(16,185,129,.24)",
      background: "rgba(14, 42, 34, 0.92)",
      pillBorder: "1px solid rgba(16,185,129,.35)",
      pillBg: "rgba(16,185,129,.12)",
    },
    {
      border: "1px solid rgba(249,115,22,.24)",
      background: "rgba(52, 28, 16, 0.92)",
      pillBorder: "1px solid rgba(249,115,22,.35)",
      pillBg: "rgba(249,115,22,.12)",
    },
  ];

  return cardThemes[idx % cardThemes.length];
}

function StatBox({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,.10)",
        borderRadius: 14,
        padding: 12,
        background: "rgba(8,12,20,.55)",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 800 }}>{value}</div>
      <div style={{ opacity: 0.75, marginTop: 4 }}>{subvalue || " "}</div>
    </div>
  );
}

export default async function AirdropPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const resolvedSearchParams =
    searchParams && typeof (searchParams as Promise<Record<string, string | string[] | undefined>>).then === "function"
      ? await (searchParams as Promise<Record<string, string | string[] | undefined>>)
      : (searchParams as Record<string, string | string[] | undefined>) || {};

  const rawPage = resolvedSearchParams?.page;
  const pageParam = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const currentPage = Math.max(1, Number(pageParam || "1") || 1);

  const supabase = await supabaseServer();

  const { data: campaigns } = await supabase
    .from("airdrop_campaigns")
    .select("id,name,description,status,start_at,end_at,lock_days,pool_tokens,per_user_cap,max_claims,video_url,details")
    .order("created_at", { ascending: false });

  const { data: statsRows } = await supabase.rpc("get_airdrop_campaign_stats_list");
  const statsMap = new Map<string, CampaignStatsRow>();
  for (const row of (statsRows || []) as CampaignStatsRow[]) {
    statsMap.set(row.id, row);
  }

  const activeCampaigns = ((campaigns ?? []) as CampaignRow[]).filter((c) =>
    (c.status || "").toLowerCase().includes("active")
  );

  const totalCampaigns = activeCampaigns.length;
  const totalPages = Math.max(1, Math.ceil(totalCampaigns / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pagedCampaigns = activeCampaigns.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <div
        style={{
          border: "1px solid rgba(255,255,255,.10)",
          borderRadius: 20,
          padding: 24,
          background: "rgba(10, 16, 28, 0.96)",
          boxShadow: "0 10px 28px rgba(0,0,0,.30)",
        }}
      >
        <div
          style={{
            display: "inline-block",
            marginBottom: 12,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(212,175,55,.40)",
            background: "rgba(212,175,55,.14)",
            color: "#f3d36b",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          SKOpi Community Bonus Rewards
        </div>

        <h1 style={{ fontSize: 36, lineHeight: 1.1, margin: "0 0 10px 0", fontWeight: 800 }}>
          SKOpi Airdrop
        </h1>

        <p style={{ fontSize: 16, opacity: 0.88, maxWidth: 760, marginBottom: 24 }}>
          Verified bonus campaigns, community reward tasks, and approved SKOpi airdrop opportunities.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <section style={{ border: "1px solid rgba(255,255,255,.10)", borderRadius: 16, padding: 18, background: "rgba(8,12,20,.55)" }}>
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>Status</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{activeCampaigns.length > 0 ? "Active" : "Not Live Yet"}</div>
          </section>

          <section style={{ border: "1px solid rgba(255,255,255,.10)", borderRadius: 16, padding: 18, background: "rgba(8,12,20,.55)" }}>
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>Campaigns</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{activeCampaigns.length} Active</div>
          </section>

          <section style={{ border: "1px solid rgba(255,255,255,.10)", borderRadius: 16, padding: 18, background: "rgba(8,12,20,.55)" }}>
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>Page</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{safePage} / {totalPages}</div>
          </section>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {pagedCampaigns.length === 0 ? (
            <section style={{ border: "1px solid rgba(255,255,255,.10)", borderRadius: 18, padding: 18, background: "rgba(10,14,24,.72)" }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>No active campaigns yet</div>
              <div style={{ opacity: 0.8 }}>As soon as a campaign is active, it will appear here.</div>
            </section>
          ) : (
            pagedCampaigns.map((campaign, idx) => {
              const modalId = `campaign-video-${startIndex + idx}`;
              const videoSrc = embedUrl(campaign.video_url) || DEFAULT_CAMPAIGN_VIDEO;
              const stats = statsMap.get(campaign.id);
              const theme = getTheme(startIndex + idx);

              const poolTokens = toNumber(stats?.pool_tokens ?? campaign.pool_tokens);
              const perUserCap = toNumber(stats?.per_user_cap ?? campaign.per_user_cap);
              const maxClaims = toNumber(stats?.max_claims ?? campaign.max_claims);
              const claimedCount = toNumber(stats?.allocation_rows ?? 0);
              const spotsLeft = Math.max(0, maxClaims - claimedCount);
              const progressPct = maxClaims > 0 ? Math.min(100, (claimedCount / maxClaims) * 100) : 0;

              return (
                <section
                  key={campaign.id}
                  style={{
                    border: theme.border,
                    borderRadius: 18,
                    padding: 18,
                    background: theme.background,
                    display: "grid",
                    gap: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "start" }}>
                    <div style={{ display: "grid", gap: 8, flex: "1 1 560px", minWidth: 320 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <Pill text="Active Campaign" />
                        <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 12, border: theme.pillBorder, background: theme.pillBg, opacity: 0.95 }}>
                          Max {maxClaims || 0}
                        </span>
                        <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 12, border: theme.pillBorder, background: theme.pillBg, opacity: 0.95 }}>
                          {campaign.lock_days ? `${campaign.lock_days}d lock` : "No lock"}
                        </span>
                      </div>

                      <h2 style={{ margin: 0, fontSize: 24 }}>{campaign.name}</h2>

                      <div style={{ opacity: 0.84 }}>
                        {campaign.description || "Community bonus campaign"}
                      </div>

                      <div
                        style={{
                          border: "1px solid rgba(255,255,255,.08)",
                          borderRadius: 14,
                          padding: 12,
                          background: "rgba(8,12,20,.55)",
                          opacity: 0.92,
                          lineHeight: 1.6,
                          minHeight: 48,
                        }}
                      >
                        {campaign.details || "No additional campaign details yet."}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flex: "0 0 220px", minWidth: 220 }}>
                      <div style={{ fontSize: 13, opacity: 0.7 }}>Reward Pool</div>
                      <div style={{ fontSize: 32, fontWeight: 800 }}>
                        {poolTokens.toLocaleString("en-US")} SKOPI
                      </div>
                      <div style={{ opacity: 0.82, marginTop: 4 }}>
                        Estimated Value: {formatMoney(poolTokens)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <StatBox
                      label="Per User Reward"
                      value={`${perUserCap.toLocaleString("en-US")} SKOPI`}
                      subvalue={`${formatMoney(perUserCap)} est. value`}
                    />
                    <StatBox
                      label="Claimed"
                      value={`${claimedCount} / ${maxClaims}`}
                      subvalue={`${spotsLeft} left`}
                    />
                    <StatBox
                      label="Lock Period"
                      value={campaign.lock_days ? `${campaign.lock_days} days` : "No lock"}
                    />
                    <StatBox
                      label="Start / End"
                      value={`${formatDate(campaign.start_at)} → ${formatDate(campaign.end_at)}`}
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, fontSize: 13 }}>
                      <div style={{ opacity: 0.78 }}>Campaign fill progress</div>
                      <div style={{ fontWeight: 800 }}>{claimedCount} / {maxClaims} claimed</div>
                    </div>
                    <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${progressPct}%`,
                          background: "linear-gradient(90deg, rgba(34,211,238,.9), rgba(212,175,55,.95))",
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid rgba(255,255,255,.08)",
                      borderRadius: 14,
                      padding: 12,
                      background: "rgba(8,12,20,.55)",
                    }}
                  >
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>How to qualify</div>
                    <div style={{ opacity: 0.84 }}>
                      Join the campaign while spots remain open, complete the required action, and submit the requested wallet or proof details when the campaign flow is live.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <CampaignVideoModal
                      title={campaign.name}
                      videoSrc={videoSrc}
                    />
                  </div>
                </section>
              );
            })
          )}
        </div>

        {totalPages > 1 ? (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <a
              href={safePage > 1 ? `/airdrop?page=${safePage - 1}` : "#"}
              style={{
                pointerEvents: safePage > 1 ? "auto" : "none",
                opacity: safePage > 1 ? 1 : 0.45,
                textDecoration: "none",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(255,255,255,.03)",
                color: "inherit",
                fontWeight: 800,
              }}
            >
              Previous
            </a>

            <div style={{ alignSelf: "center", opacity: 0.8 }}>
              Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, totalCampaigns)} of {totalCampaigns}
            </div>

            <a
              href={safePage < totalPages ? `/airdrop?page=${safePage + 1}` : "#"}
              style={{
                pointerEvents: safePage < totalPages ? "auto" : "none",
                opacity: safePage < totalPages ? 1 : 0.45,
                textDecoration: "none",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(255,255,255,.03)",
                color: "inherit",
                fontWeight: 800,
              }}
            >
              Next
            </a>
          </div>
        ) : null}
      </div>
    </main>
  );
}

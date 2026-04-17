import { supabaseServer } from "@/lib/supabase-server";
import { Container, Card, Button, Pill } from "../components/ui";
import CopyButton from "../components/CopyButton";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.skopi.io";

type PartnerRow = {
  id: string;
  user_id: string;
  referral_code: string;
  parent_ref_code: string | null;
  auto_enrolled: boolean | null;
  tax_status: string | null;
  total_paid_usdc: number | null;
  created_at: string;
  updated_at: string;
};

type CommissionRow = {
  id: string;
  created_at: string;
  intent_id: string;
  level: number;
  ref_code: string;
  usdc_atomic: string | number | bigint;
  status: string;
  payable_at: string | null;
  paid_at: string | null;
  paid_tx: string | null;
};

type PayoutRow = {
  id: string;
  partner_id: string;
  amount_usdc: number;
  status: string;
  paid_at: string | null;
  payout_reference: string | null;
  created_at: string;
};

type ReferralRow = {
  id: string;
  partner_id: string;
  user_id: string;
  first_touch: Record<string, unknown> | null;
  last_touch: Record<string, unknown> | null;
  created_at: string;
};

type PurchaseRow = {
  id: string;
  created_at: string;
  confirmed_at: string | null;
  amount_usdc_atomic: string | number | bigint;
  tokens_skopi: number | null;
  status: string;
  ft_ref_code: string | null;
  lt_ref_code: string | null;
  tt_ref_code: string | null;
};

type ClickRow = {
  id: string;
  ref_code: string;
  session_key: string;
  landing_path: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
};

type LeaderboardRow = {
  referral_code: string;
  created_at: string;
  unique_clicks: number;
  total_clicks: number;
  confirmed_purchases: number;
  revenue_influenced_usdc: number;
  total_commission_usdc: number;
};

function toBigInt(value: string | number | bigint | null | undefined): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string" && value.length > 0) return BigInt(value);
  return BigInt(0);
}

function atomicToUsdcNumber(atomic: string | number | bigint | null | undefined) {
  return Number(toBigInt(atomic)) / 1_000_000;
}

function atomicToUsdcString(atomic: string | number | bigint | null | undefined) {
  return formatMoney(atomicToUsdcNumber(atomic));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function getTouchLabel(touch: Record<string, unknown> | null | undefined) {
  if (!touch) return "Unknown";

  const candidates = [
    touch["utm_source"],
    touch["referrer"],
    touch["landing_path"],
    touch["utm_campaign"],
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value;
  }

  return "Unknown";
}

function getClickLabel(click: ClickRow) {
  return (
    click.utm_source ||
    click.utm_campaign ||
    click.referrer ||
    click.landing_path ||
    "Unknown"
  );
}

function tabHref(tab: string) {
  return `/marketing-partners?tab=${encodeURIComponent(tab)}`;
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card title={title} subtitle={subtitle}>
      <div style={{ fontFamily: "monospace", fontSize: 24, fontWeight: 800 }}>
        {value}
      </div>
    </Card>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string>>;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,.10)",
        borderRadius: 16,
        overflow: "hidden",
        background: "rgba(255,255,255,.03)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))`,
          gap: 0,
          background: "rgba(255,255,255,.04)",
          borderBottom: "1px solid rgba(255,255,255,.08)",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        {headers.map((header) => (
          <div key={header} style={{ padding: 12 }}>
            {header}
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 14, opacity: 0.75 }}>No data yet.</div>
      ) : (
        rows.map((row, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))`,
              gap: 0,
              borderTop: idx === 0 ? "none" : "1px solid rgba(255,255,255,.08)",
            }}
          >
            {row.map((cell, cellIdx) => (
              <div
                key={`${idx}-${cellIdx}`}
                style={{
                  padding: 12,
                  fontSize: 14,
                  wordBreak: "break-word",
                  opacity: 0.95,
                }}
              >
                {cell}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function TabButton({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        padding: "10px 14px",
        borderRadius: 12,
        border: active ? "1px solid rgba(34,211,238,.45)" : "1px solid rgba(255,255,255,.10)",
        background: active ? "rgba(34,211,238,.15)" : "rgba(255,255,255,.03)",
        color: active ? "#8ae7f5" : "inherit",
        fontWeight: 800,
        fontSize: 14,
      }}
    >
      {label}
    </a>
  );
}


const UMAMI_SHARE = "https://analytics.skopi.io/share/qN9aiZSsobaNfwxr";

const UMAMI_VIEWS: { label: string; path: string }[] = [
  { label: "Overview", path: "" },
  { label: "Traffic", path: "/traffic" },
  { label: "UTM", path: "/utm" },
  { label: "Realtime", path: "/realtime" },
  { label: "Events", path: "/events" },
  { label: "Sessions", path: "/sessions" },
  { label: "Performance", path: "/performance" },
  { label: "Behavior", path: "/behavior" },
];

function AnalyticsTab() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 13, opacity: 0.65 }}>
        Live site analytics powered by Umami. Switch views using the buttons below.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {UMAMI_VIEWS.map((view) => (
          
            key={view.path}
            href={`?tab=analytics&uview=${encodeURIComponent(view.path)}`}
            style={{
              textDecoration: "none",
              padding: "7px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.04)",
              color: "inherit",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {view.label}
          </a>
        ))}
      </div>
      <div
        style={{
          border: "1px solid rgba(255,255,255,.10)",
          borderRadius: 16,
          overflow: "hidden",
          background: "rgba(255,255,255,.02)",
        }}
      >
        <iframe
          src={UMAMI_SHARE}
          style={{ width: "100%", height: 680, border: "none", display: "block" }}
          loading="lazy"
        />
      </div>
      <div style={{ fontSize: 12, opacity: 0.5 }}>
        Full analytics dashboard available at{" "}
        <a href="https://analytics.skopi.io" target="_blank" rel="noreferrer" style={{ color: "#8ae7f5" }}>
          analytics.skopi.io
        </a>
      </div>
    </div>
  );
}

export default async function MarketingPartnersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const resolvedSearchParams =
    searchParams && typeof (searchParams as Promise<Record<string, string | string[] | undefined>>).then === "function"
      ? await (searchParams as Promise<Record<string, string | string[] | undefined>>)
      : (searchParams as Record<string, string | string[] | undefined>) || {};

  const rawTab = resolvedSearchParams?.tab;
  const tab = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const activeTab = ["overview", "traffic", "conversions", "commissions", "payouts", "leaderboard", "analytics"].includes(tab || "")
    ? (tab as "overview" | "traffic" | "conversions" | "commissions" | "payouts" | "leaderboard" | "analytics")
    : "overview";

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user?.id) {
    return (
      <Container>
        <Card title="Marketing Partner" subtitle="You must be logged in to view your marketing partner dashboard.">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button href="/login">Login</Button>
            <Button href="/sale" variant="secondary">Go to Sale</Button>
          </div>
        </Card>
      </Container>
    );
  }

  const { data: partner, error: partnerErr } = await supabase
    .from("marketing_partners")
    .select("id,user_id,referral_code,parent_ref_code,auto_enrolled,tax_status,total_paid_usdc,created_at,updated_at")
    .eq("user_id", user.id)
    .single<PartnerRow>();

  if (partnerErr || !partner?.referral_code) {
    return (
      <Container>
        <Card title="Marketing Partner" subtitle="Could not load your marketing partner profile.">
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(partnerErr, null, 2)}</pre>
        </Card>
      </Container>
    );
  }

  const refCode = partner.referral_code;
  const refLink = `${APP_URL}/sale?ref=${encodeURIComponent(refCode)}`;

  const [commissionsRes, payoutsRes, referralsRes, purchasesRes, clicksRes, leaderboardRes] = await Promise.all([
    supabase
      .from("affiliate_commissions")
      .select("id,created_at,intent_id,level,ref_code,usdc_atomic,status,payable_at,paid_at,paid_tx")
      .eq("ref_code", refCode)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("marketing_partner_payouts")
      .select("id,partner_id,amount_usdc,status,paid_at,payout_reference,created_at")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("marketing_partner_referrals")
      .select("id,partner_id,user_id,first_touch,last_touch,created_at")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("purchase_intents")
      .select("id,created_at,confirmed_at,amount_usdc_atomic,tokens_skopi,status,ft_ref_code,lt_ref_code,tt_ref_code")
      .eq("status", "confirmed")
      .or(`ft_ref_code.eq.${refCode},lt_ref_code.eq.${refCode},tt_ref_code.eq.${refCode}`)
      .order("confirmed_at", { ascending: false })
      .limit(100),

    supabase
      .from("affiliate_link_clicks")
      .select("id,ref_code,session_key,landing_path,referrer,utm_source,utm_medium,utm_campaign,created_at")
      .eq("ref_code", refCode)
      .order("created_at", { ascending: false })
      .limit(200),

    supabase.rpc("get_affiliate_leaderboard"),
  ]);

  const commissions = (commissionsRes.data ?? []) as CommissionRow[];
  const payouts = (payoutsRes.data ?? []) as PayoutRow[];
  const referrals = (referralsRes.data ?? []) as ReferralRow[];
  const purchases = (purchasesRes.data ?? []) as PurchaseRow[];
  const clicks = (clicksRes.data ?? []) as ClickRow[];
  const leaderboard = (leaderboardRes.data ?? []) as LeaderboardRow[];

  const pendingRows = commissions.filter((r) => r.status === "pending");
  const paidRows = commissions.filter((r) => r.status === "paid");

  const pendingSumAtomic = pendingRows.reduce((sum, row) => sum + toBigInt(row.usdc_atomic), BigInt(0));
  const paidSumAtomic = paidRows.reduce((sum, row) => sum + toBigInt(row.usdc_atomic), BigInt(0));

  const revenueInfluenced = purchases.reduce((sum, row) => sum + atomicToUsdcNumber(row.amount_usdc_atomic), 0);
  const totalPayouts = payouts.reduce((sum, row) => sum + Number(row.amount_usdc || 0), 0);

  const uniqueClicks = new Set(clicks.map((r) => r.session_key)).size;
  const conversionRate = referrals.length > 0 ? (purchases.length / referrals.length) * 100 : 0;
  const clickToReferralRate = uniqueClicks > 0 ? (referrals.length / uniqueClicks) * 100 : 0;
  const clickToPurchaseRate = uniqueClicks > 0 ? (purchases.length / uniqueClicks) * 100 : 0;

  const levelStats = [1, 2, 3].map((level) => {
    const rows = commissions.filter((r) => r.level === level);
    const pending = rows.filter((r) => r.status === "pending");
    const paid = rows.filter((r) => r.status === "paid");

    const totalAtomic = rows.reduce((sum, row) => sum + toBigInt(row.usdc_atomic), BigInt(0));
    const pendingAtomic = pending.reduce((sum, row) => sum + toBigInt(row.usdc_atomic), BigInt(0));
    const paidAtomic = paid.reduce((sum, row) => sum + toBigInt(row.usdc_atomic), BigInt(0));

    return {
      level,
      rows: rows.length,
      totalAtomic,
      pendingAtomic,
      paidAtomic,
    };
  });

  const referralSourceCounts = new Map<string, number>();
  for (const row of referrals) {
    const label = getTouchLabel(row.last_touch) || getTouchLabel(row.first_touch);
    referralSourceCounts.set(label, (referralSourceCounts.get(label) || 0) + 1);
  }
  const referralSourceBreakdown = [...referralSourceCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const clickSourceCounts = new Map<string, number>();
  for (const row of clicks) {
    const label = getClickLabel(row);
    clickSourceCounts.set(label, (clickSourceCounts.get(label) || 0) + 1);
  }
  const clickSourceBreakdown = [...clickSourceCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recentPurchasesRows = purchases.slice(0, 10).map((row) => [
    row.id.slice(0, 8),
    formatMoney(atomicToUsdcNumber(row.amount_usdc_atomic)),
    row.tokens_skopi ? row.tokens_skopi.toLocaleString("en-US") : "—",
    formatDateTime(row.confirmed_at),
  ]);

  const recentCommissionsRows = commissions.slice(0, 12).map((row) => [
    `L${row.level}`,
    atomicToUsdcString(row.usdc_atomic),
    row.status,
    formatDateTime(row.created_at),
    row.paid_at ? formatDateTime(row.paid_at) : "—",
  ]);

  const payoutRows = payouts.slice(0, 12).map((row) => [
    formatMoney(Number(row.amount_usdc || 0)),
    row.status,
    row.payout_reference || "—",
    row.paid_at ? formatDateTime(row.paid_at) : "—",
    formatDateTime(row.created_at),
  ]);

  const recentClickRows = clicks.slice(0, 12).map((row) => [
    row.session_key.slice(0, 8),
    row.utm_source || "—",
    row.utm_campaign || "—",
    row.landing_path || "—",
    formatDateTime(row.created_at),
  ]);

  const leaderboardRows = leaderboard.map((row, idx) => [
    String(idx + 1),
    row.referral_code,
    String(row.unique_clicks || 0),
    String(row.confirmed_purchases || 0),
    formatMoney(Number(row.revenue_influenced_usdc || 0)),
    formatMoney(Number(row.total_commission_usdc || 0)),
    formatDate(row.created_at),
  ]);

  const myRankIndex = leaderboard.findIndex((r) => r.referral_code === refCode);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : "—";

  return (
    <Container>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <h1 style={{ margin: 0 }}>Marketing Partner Dashboard</h1>
          <div style={{ opacity: 0.72, marginTop: 6 }}>
            Track your referral traffic, conversions, commissions, payouts, and leaderboard position.
          </div>
        </div>

        <section
          style={{
            border: "1px solid rgba(255,255,255,.10)",
            borderRadius: 20,
            padding: 18,
            background: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02))",
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Pill text="Marketing Partner" />
                <Pill text={refCode} />
                {partner.auto_enrolled ? <Pill text="Auto-enrolled" /> : null}
              </div>
              <div style={{ fontSize: 14, opacity: 0.76 }}>
                Your referral link
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button href="/sale" variant="secondary">Go to Sale</Button>
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(255,255,255,.10)",
              borderRadius: 14,
              padding: 12,
              background: "rgba(255,255,255,.04)",
              display: "flex",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontFamily: "monospace", fontSize: 14, wordBreak: "break-all" }}>
              {refLink}
            </div>
            <CopyButton value={refLink} label="Copy link" />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <TabButton active={activeTab === "overview"} href={tabHref("overview")} label="Overview" />
            <TabButton active={activeTab === "traffic"} href={tabHref("traffic")} label="Traffic" />
            <TabButton active={activeTab === "conversions"} href={tabHref("conversions")} label="Conversions" />
            <TabButton active={activeTab === "commissions"} href={tabHref("commissions")} label="Commissions" />
            <TabButton active={activeTab === "payouts"} href={tabHref("payouts")} label="Payouts" />
            <TabButton active={activeTab === "leaderboard"} href={tabHref("leaderboard")} label="Leaderboard" />
            <TabButton active={activeTab === "analytics"} href={tabHref("analytics")} label="Analytics" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <StatCard title="Referred Users" value={String(referrals.length)} />
            <StatCard title="Confirmed Purchases" value={String(purchases.length)} />
            <StatCard title="Revenue Influenced" value={formatMoney(revenueInfluenced)} />
            <StatCard title="Unique Clicks" value={String(uniqueClicks)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {levelStats.map((item) => (
              <Card
                key={item.level}
                title={`Level ${item.level} Earnings`}
                subtitle={`Pays ${item.level === 1 ? "8%" : item.level === 2 ? "3%" : "1%"} • ${item.rows} commission row${item.rows === 1 ? "" : "s"}`}
              >
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 24, fontWeight: 800 }}>
                    {formatMoney(atomicToUsdcNumber(item.totalAtomic))}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.78 }}>
                    Pending: {formatMoney(atomicToUsdcNumber(item.pendingAtomic))} • Paid: {formatMoney(atomicToUsdcNumber(item.paidAtomic))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {activeTab === "overview" ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <StatCard title="Pending Commissions" value={formatMoney(atomicToUsdcNumber(pendingSumAtomic))} subtitle={`${pendingRows.length} row(s)`} />
              <StatCard title="Paid Commissions" value={formatMoney(atomicToUsdcNumber(paidSumAtomic))} subtitle={`${paidRows.length} row(s)`} />
              <StatCard title="Total Payouts" value={formatMoney(totalPayouts)} subtitle={`${payouts.length} payout row(s)`} />
              <StatCard title="Conversion Rate" value={`${conversionRate.toFixed(1)}%`} subtitle="Purchases / referred users" />
            </div>

            <Card title="Recent Confirmed Purchases" subtitle="Latest confirmed purchases influenced by your link">
              <DataTable headers={["Intent", "USDC", "SKOpi", "Confirmed"]} rows={recentPurchasesRows} />
            </Card>

            <Card title="Recent Commissions" subtitle="Latest commission activity across all levels">
              <DataTable headers={["Level", "Amount", "Status", "Created", "Paid"]} rows={recentCommissionsRows} />
            </Card>
          </div>
        ) : null}

        {activeTab === "traffic" ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <StatCard title="Total Click Rows" value={String(clicks.length)} />
              <StatCard title="Unique Click Sessions" value={String(uniqueClicks)} />
              <StatCard title="Click → Referral" value={`${clickToReferralRate.toFixed(1)}%`} />
              <StatCard title="Click → Purchase" value={`${clickToPurchaseRate.toFixed(1)}%`} />
            </div>

            <Card title="Traffic Sources" subtitle="Top click sources seen on your referral traffic">
              <DataTable headers={["Source", "Clicks"]} rows={clickSourceBreakdown.map((row) => [row.label, String(row.count)])} />
            </Card>

            <Card title="Recent Clicks" subtitle="Latest logged visits to your referral link">
              <DataTable headers={["Session", "UTM Source", "UTM Campaign", "Landing Path", "Created"]} rows={recentClickRows} />
            </Card>
          </div>
        ) : null}

        {activeTab === "conversions" ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <StatCard title="Referred Users" value={String(referrals.length)} />
              <StatCard title="Confirmed Purchases" value={String(purchases.length)} />
              <StatCard title="Revenue Influenced" value={formatMoney(revenueInfluenced)} />
              <StatCard title="Referral → Purchase" value={`${conversionRate.toFixed(1)}%`} />
            </div>

            <Card title="Referral Sources" subtitle="Most common last-touch / first-touch source labels">
              <DataTable headers={["Source", "Referrals"]} rows={referralSourceBreakdown.map((row) => [row.label, String(row.count)])} />
            </Card>

            <Card title="Recent Confirmed Purchases" subtitle="Latest influenced conversions">
              <DataTable headers={["Intent", "USDC", "SKOpi", "Confirmed"]} rows={recentPurchasesRows} />
            </Card>
          </div>
        ) : null}

        {activeTab === "commissions" ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {levelStats.map((item) => (
                <StatCard
                  key={`commissions-level-${item.level}`}
                  title={`Level ${item.level}`}
                  value={formatMoney(atomicToUsdcNumber(item.totalAtomic))}
                  subtitle={`${item.level === 1 ? "8%" : item.level === 2 ? "3%" : "1%"} payout • Pending ${formatMoney(atomicToUsdcNumber(item.pendingAtomic))} • Paid ${formatMoney(atomicToUsdcNumber(item.paidAtomic))}`}
                />
              ))}
            </div>

            <Card title="Commission History" subtitle="All recent commission rows">
              <DataTable headers={["Level", "Amount", "Status", "Created", "Paid"]} rows={recentCommissionsRows} />
            </Card>
          </div>
        ) : null}

        {activeTab === "payouts" ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <StatCard title="Total Payouts" value={formatMoney(totalPayouts)} />
              <StatCard title="Payout Rows" value={String(payouts.length)} />
              <StatCard title="Partner Paid Total" value={formatMoney(Number(partner.total_paid_usdc || 0))} />
              <StatCard title="Tax Status" value={partner.tax_status || "—"} />
            </div>

            <Card title="Payout History" subtitle="Latest payout records">
              <DataTable headers={["Amount", "Status", "Reference", "Paid", "Created"]} rows={payoutRows} />
            </Card>
          </div>
        ) : null}

        {activeTab === "leaderboard" ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <StatCard title="Your Rank" value={String(myRank)} />
              <StatCard title="Leaderboard Entries" value={String(leaderboard.length)} />
              <StatCard title="Top Unique Clicks" value={String(leaderboard[0]?.unique_clicks || 0)} />
              <StatCard title="Top Commissions" value={formatMoney(Number(leaderboard[0]?.total_commission_usdc || 0))} />
            </div>

            <Card title="Affiliate Leaderboard" subtitle="Top affiliates by commissions, revenue, and traffic">
              <DataTable
                headers={["Rank", "Code", "Unique Clicks", "Purchases", "Revenue", "Commissions", "Joined"]}
                rows={leaderboardRows}
              />
            </Card>
          </div>
        ) : null}
      </div>

        {activeTab === "analytics" ? (
          <div style={{ display: "grid", gap: 14 }}>
            <AnalyticsTab />
          </div>
        ) : null}
      </div>
    </Container>
  );
}

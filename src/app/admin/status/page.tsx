export const dynamic = "force-dynamic";

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr 90px",
        gap: 12,
        padding: "10px 12px",
        borderTop: "1px solid #eee",
        alignItems: "center",
        fontSize: 14,
      }}
    >
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: "monospace", wordBreak: "break-all", opacity: 0.9 }}>
        {value || "—"}
      </div>
      <div style={{ fontFamily: "monospace" }}>{ok ? "OK" : "MISSING"}</div>
    </div>
  );
}

export default async function AdminStatusPage() {
  const env = {
    ADMIN_EMAILS: process.env.ADMIN_EMAILS || "",
    ADMIN_FORCE_CONFIRM_TOKEN: process.env.ADMIN_FORCE_CONFIRM_TOKEN ? "(set)" : "",
    NEXT_PUBLIC_ADMIN_FORCE_CONFIRM_TOKEN: process.env.NEXT_PUBLIC_ADMIN_FORCE_CONFIRM_TOKEN ? "(set)" : "",
    NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS: process.env.NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS || "",
    NEXT_PUBLIC_USDC_MINT: process.env.NEXT_PUBLIC_USDC_MINT || "",
    HELIUS_RPC_URL: process.env.HELIUS_RPC_URL ? "(set)" : "",
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ? "(set)" : "",
    VERIFY_REAL_CAN_CONFIRM: process.env.VERIFY_REAL_CAN_CONFIRM || "false",
  };

  const links = [
    { href: "/sale", label: "Sale" },
    { href: "/affiliate", label: "Affiliate" },
    { href: "/me/purchases", label: "My Purchases" },
    { href: "/admin/intents", label: "Admin Intents" },
    { href: "/admin/commissions", label: "Admin Commissions" },
    { href: "/admin/payouts", label: "Admin Payouts" },
  ];

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Admin Status</h1>
      <p style={{ marginTop: 8, opacity: 0.85 }}>
        Quick health view for env + core ops links.
      </p>

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            style={{
              textDecoration: "none",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #ddd",
              color: "#111",
              fontSize: 14,
            }}
          >
            {l.label}
          </a>
        ))}
      </div>

      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ background: "#f6f6f6", padding: "10px 12px", fontWeight: 800 }}>
          Environment
        </div>

        <Row label="ADMIN_EMAILS" value={env.ADMIN_EMAILS} ok={!!env.ADMIN_EMAILS} />
        <Row label="ADMIN_FORCE_CONFIRM_TOKEN" value={env.ADMIN_FORCE_CONFIRM_TOKEN} ok={!!env.ADMIN_FORCE_CONFIRM_TOKEN} />
        <Row label="NEXT_PUBLIC_ADMIN_FORCE_CONFIRM_TOKEN" value={env.NEXT_PUBLIC_ADMIN_FORCE_CONFIRM_TOKEN} ok={!!env.NEXT_PUBLIC_ADMIN_FORCE_CONFIRM_TOKEN} />
        <Row label="NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS" value={env.NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS} ok={!!env.NEXT_PUBLIC_SKOPI_TREASURY_ADDRESS} />
        <Row label="NEXT_PUBLIC_USDC_MINT" value={env.NEXT_PUBLIC_USDC_MINT} ok={!!env.NEXT_PUBLIC_USDC_MINT} />
        <Row label="HELIUS_RPC_URL" value={env.HELIUS_RPC_URL} ok={!!env.HELIUS_RPC_URL} />
        <Row label="NEXT_PUBLIC_SOLANA_RPC_URL" value={env.NEXT_PUBLIC_SOLANA_RPC_URL} ok={!!env.NEXT_PUBLIC_SOLANA_RPC_URL} />
        <Row label="VERIFY_REAL_CAN_CONFIRM" value={env.VERIFY_REAL_CAN_CONFIRM} ok={env.VERIFY_REAL_CAN_CONFIRM === "true"} />
      </div>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
        <b>Next:</b> once all env vars are OK, do one tiny USDC payment test and verify it auto-confirms + generates commissions.
      </div>
    </main>
  );
}

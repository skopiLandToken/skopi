export const dynamic = "force-dynamic";

export default function AirdropPage() {
  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
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
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>What will appear here</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Verified bonus tasks</div>
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

        <p style={{ margin: 0, opacity: 0.7 }}>
          Once the first real campaign is launched, this page will show active tasks, bonus amounts,
          submission rules, and live remaining allocation.
        </p>
      </div>
    </main>
  );
}

export default function TransparencyPage() {
  const docs = [
    { label: "Transparency Workflow", href: "https://github.com/skopiLandToken/skopi/blob/main/docs/transparency-workflow.md" },
    { label: "Security Policy", href: "https://github.com/skopiLandToken/skopi/blob/main/SECURITY.md" },
    { label: "Changelog", href: "https://github.com/skopiLandToken/skopi/blob/main/docs/changelog.md" },
    { label: "Token Launch Verification", href: "https://github.com/skopiLandToken/skopi/blob/main/docs/token-launch.md" },
    { label: "Airdrop V2 Schema", href: "https://github.com/skopiLandToken/skopi/blob/main/supabase/airdrop_v2_schema.sql" },
    { label: "Airdrop V2 FCFS Logic", href: "https://github.com/skopiLandToken/skopi/blob/main/supabase/airdrop_v2_fcfs.sql" },
  ];

  return (
    <main style={{ maxWidth: 900, margin: "32px auto", padding: "0 16px", lineHeight: 1.6 }}>
      <h1>SKOpi Transparency</h1>
      <p>
        We publish core allocation and policy logic so anyone can verify that SKOpi behavior matches what we publicly claim.
      </p>

      <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Public verification links</h3>
        <ul>
          {docs.map((d) => (
            <li key={d.href}>
              <a href={d.href} target="_blank" rel="noreferrer">
                {d.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>How to verify quickly</h3>
        <ol>
          <li>Open the latest tagged release and commit SHA in GitHub.</li>
          <li>Check the SQL migrations for rules (pool caps, FCFS behavior, lock mechanics).</li>
          <li>Check API routes that call those rules.</li>
          <li>Compare live endpoint behavior with documented logic.</li>
        </ol>
      </section>

      <p style={{ marginTop: 14, opacity: 0.8 }}>
        If you find a discrepancy or potential vulnerability, report it per the Security Policy.
      </p>
    </main>
  );
}

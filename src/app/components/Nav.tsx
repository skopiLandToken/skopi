export default function Nav() {
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
          <a href="/affiliate" style={linkStyle}>Affiliate</a>
          <a href="/admin/intents" style={linkStyle}>Admin Intents</a>
          <a href="/admin/commissions" style={linkStyle}>Admin Commissions</a>
          <a href="/admin/payouts" style={linkStyle}>Admin Payouts</a>
          <a href="/login" style={linkStyle}>Login</a>
          <a href="/logout" style={linkStyle}>Logout</a>
        </nav>
      </div>
    </header>
  );
}

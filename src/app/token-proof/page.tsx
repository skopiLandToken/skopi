import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function getProof() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "app.skopi.io";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;
  const res = await fetch(`${baseUrl}/api/token-proof`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Token-proof fetch failed: ${res.status}`);
  return res.json();
}


function fmtRaw(raw: string, decimals: number) {
  const neg = raw.startsWith("-");
  const s = neg ? raw.slice(1) : raw;

  const pad = s.padStart(decimals + 1, "0");
  const iStr = pad.slice(0, -decimals);
  const fStr = pad.slice(-decimals);

  // format integer part safely
  const iFmt = new Intl.NumberFormat("en-US").format(Number(iStr));
  return `${neg ? "-" : ""}${iFmt}.${fStr}`;
}


export default async function TokenProofPage() {
  const data = await getProof();
  const d = data.decimals ?? 6;

  const rows = [
    ["Treasury (minted ATA)", data.accounts.treasuryAta.address, data.accounts.treasuryAta.amountRaw ],
    ["Treasury Bucket", data.accounts.treasuryBucketAta.address, data.accounts.treasuryBucketAta.amountRaw ],
    ["Public Sale", data.accounts.saleAta.address, data.accounts.saleAta.amountRaw ],
    ["Founders", data.accounts.foundersAta.address, data.accounts.foundersAta.amountRaw ],
    ["Liquidity", data.accounts.liqAta.address, data.accounts.liqAta.amountRaw ],
    ["Community", data.accounts.commAta.address, data.accounts.commAta.amountRaw ],
  ];

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>SKOpi Token Proof (Localnet)</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        RPC: <code>{data.rpcUrl}</code>
        <br />
        Mint: <code>{data.mint}</code>
        <br />
        Supply: <strong>{data.supplyUi}</strong> (decimals: {d})
      </p>

      <div style={{ marginTop: 20, border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#111" }}>
              <th style={{ textAlign: "left", padding: 12 }}>Bucket</th>
              <th style={{ textAlign: "left", padding: 12 }}>Token Account</th>
              <th style={{ textAlign: "right", padding: 12 }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, addr, raw]: any) => (
              <tr key={label} style={{ borderTop: "1px solid #222" }}>
                <td style={{ padding: 12 }}>{label}</td>
                <td style={{ padding: 12 }}>
                  <code style={{ fontSize: 12 }}>{addr}</code>
                </td>
                <td style={{ padding: 12, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {fmtRaw(raw, d)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 16, opacity: 0.7 }}>
        This page reads <code>/api/token-proof</code> and formats raw token units into UI units (6 decimals).
      </p>
    </main>
  );
}

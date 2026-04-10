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
  const iFmt = new Intl.NumberFormat("en-US").format(Number(iStr));
  return `${neg ? "-" : ""}${iFmt}.${fStr}`;
}

export default async function TokenProofPage() {
  const data = await getProof();
  const d = data.decimals ?? 6;

  const rows = [
    ["Treasury (minted ATA)", data.accounts.treasuryAta.address, data.accounts.treasuryAta.amountRaw],
    ["Treasury Bucket", data.accounts.treasuryBucketAta.address, data.accounts.treasuryBucketAta.amountRaw],
    ["Public Sale", data.accounts.saleAta.address, data.accounts.saleAta.amountRaw],
    ["Founders", data.accounts.foundersAta.address, data.accounts.foundersAta.amountRaw],
    ["Liquidity", data.accounts.liqAta.address, data.accounts.liqAta.amountRaw],
    ["Community", data.accounts.commAta.address, data.accounts.commAta.amountRaw],
  ];

  const movementLog = Array.isArray(data.publicMovementLog) ? data.publicMovementLog : [];

  return (
    <main style={{ padding: 24, maxWidth: 1080, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>SKOpi Token Proof (Mainnet)</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        RPC: <code>{data.rpcUrl}</code>
        <br />
        Mint: <code>{data.mint}</code>
        <br />
        Mint authority: <strong>{data.mintAuthority ? data.mintAuthority : "DISABLED"}</strong>
        <br />
        Freeze authority: <strong>{data.freezeAuthority ? data.freezeAuthority : "NOT SET"}</strong>
        <br />
        Lock tx: <code>2AriaasEZ1347UKxugdXQRwjvqKrpxYBUVS1EcUU6GrBi6UCYH6Exu59ubnze8D9rGWtxBz8iHK7efB8JBRQeHoW</code>
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
                  <code style={{ fontSize: 12, wordBreak: "break-all" }}>{addr}</code>
                </td>
                <td style={{ padding: 12, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {fmtRaw(raw, d)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Public Token Movement Log</h2>
        <p style={{ opacity: 0.78, marginBottom: 14 }}>
          This section is for major public-facing transfers, manual test allocations, and any treasury notes we want visible.
        </p>

        <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#111" }}>
                <th style={{ textAlign: "left", padding: 12 }}>Date / Time (UTC)</th>
                <th style={{ textAlign: "left", padding: 12 }}>Label</th>
                <th style={{ textAlign: "left", padding: 12 }}>From</th>
                <th style={{ textAlign: "left", padding: 12 }}>To</th>
                <th style={{ textAlign: "right", padding: 12 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {movementLog.map((item: any) => (
                <tr key={item.id} style={{ borderTop: "1px solid #222", verticalAlign: "top" }}>
                  <td style={{ padding: 12, whiteSpace: "nowrap" }}>{item.when}</td>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 700 }}>{item.label}</div>
                    <div style={{ marginTop: 6, opacity: 0.8 }}>{item.note}</div>
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                      Type: {item.type}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                      Tx: <code style={{ wordBreak: "break-all" }}>{item.txSignature}</code>
                    </div>
                  </td>
                  <td style={{ padding: 12 }}>
                    <div>{item.sourceBucket}</div>
                    <code style={{ fontSize: 12, wordBreak: "break-all" }}>{item.sourceWallet}</code>
                  </td>
                  <td style={{ padding: 12 }}>
                    <code style={{ fontSize: 12, wordBreak: "break-all" }}>{item.destinationWallet}</code>
                  </td>
                  <td style={{ padding: 12, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {fmtRaw(item.amountRaw, d)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p style={{ marginTop: 16, opacity: 0.7 }}>
        This page reads <code>/api/token-proof</code> for live balances and a public movement log layer for disclosed transfers and treasury notes.
      </p>
    </main>
  );
}

export const dynamic = "force-dynamic";


import { createClient } from "@supabase/supabase-js";

type Row = {
  id: string;
  intent_id: string;
  level: number;
  ref_code: string;
  usdc_atomic: number;
  status: string;
  payable_at: string | null;
  created_at: string;
  paid_at: string | null;
  paid_tx: string | null;
  payout_wallet_address?: string | null;
};

function normalizeToken(v: string) {
  const s = (v || "").trim();
  // strip surrounding quotes if present
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).trim();
  }
  return s;
}

function usdcDisplay(usdcAtomic: number) {
  return (Number(usdcAtomic || 0) / 1_000_000).toFixed(6);
}

function groupByRef(rows: Row[]) {
  const map = new Map<
    string,
    { ref_code: string; wallet: string | null; total_atomic: number; ids: string[]; rows: Row[] }
  >();
  for (const r of rows) {
    if (!map.has(r.ref_code)) {
      map.set(r.ref_code, {
        ref_code: r.ref_code,
        wallet: r.payout_wallet_address ?? null,
        total_atomic: 0,
        ids: [],
        rows: [],
      });
    }
    const g = map.get(r.ref_code)!;
    if (!g.wallet && r.payout_wallet_address) g.wallet = r.payout_wallet_address;
    g.total_atomic += Number(r.usdc_atomic || 0);
    g.ids.push(r.id);
    g.rows.push(r);
  }
  return [...map.values()].sort((a, b) => b.total_atomic - a.total_atomic);
}

async function fetchPayables(): Promise<Row[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: comms, error: commErr } = await supabase
    .from("affiliate_commissions")
    .select("id,intent_id,level,ref_code,usdc_atomic,status,payable_at,created_at,paid_at,paid_tx")
    .in("status", ["pending", "payable"])
    .order("created_at", { ascending: true })
    .limit(1000);

  if (commErr) throw new Error(commErr.message);

  const rows = (comms || []) as Row[];
  const refCodes = [...new Set(rows.map((r) => r.ref_code).filter(Boolean))];

  let walletsByRef: Record<string, string | null> = {};
  if (refCodes.length) {
    const { data: partners, error: mpErr } = await supabase
      .from("marketing_partners")
      .select("referral_code,payout_wallet_address")
      .in("referral_code", refCodes);

    if (mpErr) throw new Error(mpErr.message);

    walletsByRef = Object.fromEntries(
      (partners || []).map((p: any) => [p.referral_code, p.payout_wallet_address ?? null])
    );
  }

  return rows.map((r) => ({
    ...r,
    payout_wallet_address: walletsByRef[r.ref_code] ?? null,
  }));
}

async function markPaidBatch(formData: FormData) {
  "use server";

  const adminParam = normalizeToken(String(formData.get("admin_read_token") || ""));
  const expected = normalizeToken(process.env.ADMIN_READ_TOKEN || "");
  if (!expected || adminParam !== expected) {
    throw new Error("Unauthorized");
  }

  const tx = String(formData.get("paid_tx") || "").trim();
  const idsRaw = String(formData.get("commission_ids") || "").trim();
  if (!tx) throw new Error("paid_tx required");
  if (!idsRaw) throw new Error("commission_ids required");

  const ids = idsRaw.split("|").map((s) => s.trim()).filter(Boolean);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (const id of ids) {
    const { error } = await supabase
      .from("affiliate_commissions")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_tx: tx,
      })
      .eq("id", id)
      .in("status", ["pending", "payable"]);

    if (error) throw new Error(`Failed marking ${id}: ${error.message}`);
  }
}

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const tRaw = Array.isArray(searchParams.t) ? searchParams.t[0] : (searchParams.t || "");
  const t = normalizeToken(tRaw);
  const expected = normalizeToken(process.env.ADMIN_READ_TOKEN || "");

  if (!expected || t !== expected) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Admin Payouts</h1>
        <p style={{ marginTop: 12 }}>
          Unauthorized. Append <code>?t=ADMIN_READ_TOKEN</code> to the URL.
        </p>
      </div>
    );
  }

  const rows = await fetchPayables();
  const groups = groupByRef(rows);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Admin Payouts</h1>
      <p style={{ opacity: 0.8, marginBottom: 18 }}>
        Pending/payable affiliate commissions grouped by referral code. Mark paid after you send USDC.
      </p>

      <div style={{ marginBottom: 16, padding: 12, border: "1px solid #333", borderRadius: 10 }}>
        <div><strong>Total rows:</strong> {rows.length}</div>
        <div><strong>Groups:</strong> {groups.length}</div>
      </div>

      {groups.length === 0 ? (
        <div style={{ padding: 12, border: "1px solid #333", borderRadius: 10 }}>
          No pending/payable commissions right now.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {groups.map((g) => (
            <div key={g.ref_code} style={{ border: "1px solid #333", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{g.ref_code}</div>
                  <div style={{ opacity: 0.85 }}>
                    Total: <strong>{usdcDisplay(g.total_atomic)} USDC</strong>
                  </div>
                  <div style={{ opacity: 0.85 }}>
                    Wallet:{" "}
                    {g.wallet ? <code>{g.wallet}</code> : <span style={{ color: "crimson" }}>MISSING</span>}
                  </div>
                </div>

                <form action={markPaidBatch} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <input type="hidden" name="admin_read_token" value={tRaw} />
                  <input type="hidden" name="commission_ids" value={g.ids.join("|")} />

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, opacity: 0.8 }}>Tx signature (paste after payout)</label>
                    <input
                      name="paid_tx"
                      placeholder="Solana tx signature"
                      style={{ width: 360, padding: "10px 12px", borderRadius: 10, border: "1px solid #333" }}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!g.wallet}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #333",
                      cursor: g.wallet ? "pointer" : "not-allowed",
                    }}
                    title={!g.wallet ? "Set payout wallet first" : "Mark all rows paid"}
                  >
                    Mark Paid ({g.ids.length})
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

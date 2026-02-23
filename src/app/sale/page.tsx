import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

type Tranche = {
  id: string;
  price_usdc: number;
  tokens_remaining: number;
  is_active: boolean;
  created_at: string;
  sort_order?: number | null;
};

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function formatPrice(n: number) {
  // Keep it readable for tranche pricing (like 0.005)
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 6 });
}

export default async function SalePage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(url, anon);

  // Try to order by sort_order if it exists, otherwise created_at
  // (Supabase will ignore unknown order columns by error; we’ll fallback)
  let tranches: Tranche[] = [];
  const bySort = await supabase
    .from("tranches")
    .select("id, price_usdc, tokens_remaining, is_active, created_at, sort_order")
    .order("sort_order", { ascending: true });

  if (!bySort.error && bySort.data) {
    tranches = bySort.data as Tranche[];
  } else {
    const byCreated = await supabase
      .from("tranches")
      .select("id, price_usdc, tokens_remaining, is_active, created_at")
      .order("created_at", { ascending: true });

    tranches = (byCreated.data || []) as Tranche[];
  }

  const active = tranches.find((t) => t.is_active);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">SKOpi Sale</h1>
        <p className="text-sm text-gray-600">
          Pick a tranche, choose an amount, and you’ll be guided through checkout.
        </p>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm text-gray-600">Active tranche</div>
            <div className="text-lg font-semibold">
              {active ? `$${formatPrice(active.price_usdc)} / SKOPI` : "None active"}
            </div>
            {active && (
              <div className="text-sm text-gray-600">
                Remaining: <span className="font-medium">{formatNumber(active.tokens_remaining)}</span> SKOPI
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {[10, 25, 50, 100].map((amt) => (
              <Link
                key={amt}
                href={`/buy?amount=${amt}`}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Buy ${amt}
              </Link>
            ))}
            <Link
              href="/buy"
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Custom amount
            </Link>
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Tranche ladder</h2>

      <div className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Remaining</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {tranches.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-gray-600" colSpan={4}>
                  No tranches found.
                </td>
              </tr>
            ) : (
              tranches.map((t) => {
                const soldOut = (t.tokens_remaining ?? 0) <= 0;
                const status = soldOut ? "Sold out" : t.is_active ? "Active" : "Upcoming";
                return (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                          soldOut
                            ? "bg-gray-100 text-gray-700"
                            : t.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800",
                        ].join(" ")}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">${formatPrice(t.price_usdc)}</td>
                    <td className="px-4 py-3">{formatNumber(t.tokens_remaining)}</td>
                    <td className="px-4 py-3">
                      {soldOut ? (
                        <span className="text-gray-500">—</span>
                      ) : (
                        <Link
                          href={`/buy?amount=10`}
                          className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                        >
                          Buy
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 text-sm text-gray-600">
        <p>
          Tip: Your purchase intent is created first, then you send USDC and the system verifies and confirms your intent.
        </p>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function clampAmount(n: number) {
  if (!Number.isFinite(n)) return 0;
  if (n < 1) return 1;
  if (n > 100000) return 100000;
  return n;
}

export default function BuyClient({
  initialAmount,
  initialRefCode,
  nextPath,
}: {
  initialAmount: number;
  initialRefCode: string;
  nextPath: string;
}) {
  const router = useRouter();

  const [amountUsdc, setAmountUsdc] = useState<number>(initialAmount || 10);
  const [refCode, setRefCode] = useState<string>(initialRefCode || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const nextEncoded = useMemo(() => encodeURIComponent(nextPath), [nextPath]);

  useEffect(() => {
    // Keep amount safe
    setAmountUsdc((v) => clampAmount(v || 10));
  }, []);

  async function ensureSessionToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || null;
    return token;
  }

  async function onSubmit() {
    setErr("");
    setLoading(true);
    try {
      const token = await ensureSessionToken();
      if (!token) {
        router.push(`/auth/login?next=${nextEncoded}`);
        return;
      }

      const res = await fetch("/api/purchase-intents", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amountUsdc,
          refCode: refCode.trim() || null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!json?.ok) {
        setErr(json?.error || "Failed to create intent");
        return;
      }

      const id = json?.intent?.id;
      if (!id) {
        setErr("Intent created but missing id");
        return;
      }

      router.push(`/receipt/${id}`);
    } catch (e: any) {
      setErr(e?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Buy SKOpi</h1>
      <p className="mt-2 text-sm text-gray-600">
        Enter an amount in USDC. We’ll create a purchase intent and send you to a receipt with payment instructions.
      </p>

      <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-gray-700">Amount (USDC)</label>
        <input
          className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring"
          type="number"
          inputMode="decimal"
          min={1}
          step="1"
          value={amountUsdc}
          onChange={(e) => setAmountUsdc(clampAmount(Number(e.target.value)))}
        />

        <label className="mt-4 block text-sm font-medium text-gray-700">Referral code (optional)</label>
        <input
          className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring"
          placeholder="e.g. CCC"
          value={refCode}
          onChange={(e) => setRefCode(e.target.value)}
        />

        {err ? <div className="mt-4 text-sm text-red-600">{err}</div> : null}

        <button
          className="mt-5 w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? "Creating intent..." : "Continue"}
        </button>

        <p className="mt-3 text-xs text-gray-500">
          If you’re not logged in, you’ll be redirected to login.
        </p>
      </div>
    </main>
  );
}

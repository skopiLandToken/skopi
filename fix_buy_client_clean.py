from pathlib import Path

TARGET = Path("src/app/buy/buy-client.tsx")

TSX = r"""'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function BuyClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const amount = sp.get("amount") || "";
  const refCode = (sp.get("ref") || "").trim().toUpperCase() || null;

  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setErr(null);
      setCreating(true);

      try {
        const supabase = supabaseBrowser();

        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (sessionErr) throw sessionErr;

        if (!session?.access_token) {
          if (!cancelled) {
            setErr("You need to log in before buying. Redirecting to /login…");
            setCreating(false);
            setTimeout(() => router.push("/login?next=/sale"), 600);
          }
          return;
        }

        const amountNum = Number(amount);
        if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
          if (!cancelled) {
            setErr("Invalid amount. Go back to Sale and try again.");
            setCreating(false);
          }
          return;
        }

        const resp = await fetch("/api/purchase-intents", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            amountUsdc: amountNum,
            refCode: refCode,
          }),
        });

        const json: any = await resp.json().catch(() => ({}));

        const intentId =
          json?.intent?.id ||
          (Array.isArray(json?.intent) ? json.intent?.[0]?.id : null);

        if (!resp.ok || !intentId) {
          const msg =
            json?.error ||
            json?.message ||
            `Failed to create purchase intent (HTTP ${resp.status}).`;
          throw new Error(msg);
        }

        if (!cancelled) {
          router.push(`/receipt/${intentId}`);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Failed to create purchase. Try again.");
          setCreating(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [amount, refCode, router]);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        Creating your purchase…
      </h1>
      <div style={{ opacity: 0.85, marginBottom: 14 }}>Amount: ${amount || "—"}</div>

      {err && (
        <div
          style={{
            border: "1px solid #c33",
            borderRadius: 12,
            padding: 14,
            background: "rgba(255,0,0,0.06)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Notice:</div>
          <div style={{ marginBottom: 12 }}>{err}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #333",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      )}

      {!err && creating && (
        <div style={{ opacity: 0.75 }}>
          Working… (if this hangs, click “Try again”)
        </div>
      )}
    </div>
  );
}
"""

def main():
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(TSX, encoding="utf-8")
    print(f"✅ Overwrote {TARGET}")

if __name__ == "__main__":
    main()

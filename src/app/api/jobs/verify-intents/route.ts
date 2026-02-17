import { NextResponse } from "next/server";
import { listCreatedIntents, verifyIntentObject } from "@/lib/verify-intent";

const cronSecret = process.env.CRON_SECRET;

function authorized(req: Request) {
  if (!cronSecret) return false;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const headerSecret = req.headers.get("x-cron-secret") || "";
  return bearer === cronSecret || headerSecret === cronSecret;
}

async function runBatch(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get("limit") || 25);
  const limit = Math.max(1, Math.min(limitRaw, 100));

  const { data: intents, error } = await listCreatedIntents(limit);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let scanned = 0;
  let confirmed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const intent of intents) {
    scanned += 1;
    try {
      const res = await verifyIntentObject(intent);
      if (res.ok && res.matched) confirmed += 1;
      if (!res.ok) errors.push({ id: intent.id, error: (res as any).error || "unknown" });
    } catch (e: any) {
      errors.push({ id: intent.id, error: e?.message || "unknown" });
    }
  }

  return NextResponse.json({
    ok: true,
    scanned,
    confirmed,
    remainingCreated: Math.max(0, intents.length - confirmed),
    errors,
  });
}

export async function POST(req: Request) {
  return runBatch(req);
}

export async function GET(req: Request) {
  return runBatch(req);
}

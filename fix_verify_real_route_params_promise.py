from pathlib import Path

TARGET = Path("src/app/api/verify-real/[id]/route.ts")

TS = r"""import { NextRequest, NextResponse } from "next/server";
import { verifyIntentById } from "@/lib/verify-intent";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const p = await context.params;
    const id = String(p?.id || "").trim();

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing intent id" }, { status: 400 });
    }

    const result = await verifyIntentById(id);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    if (result.matched) {
      return NextResponse.json({ ok: true, found: true, intent: result.intent });
    }

    return NextResponse.json({ ok: true, found: false, reason: result.reason });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
"""

def main():
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(TS, encoding="utf-8")
    print(f"✅ Overwrote {TARGET}")

if __name__ == "__main__":
    main()

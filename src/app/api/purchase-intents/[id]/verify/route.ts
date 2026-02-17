import { NextResponse } from "next/server";
import { verifyIntentById } from "@/lib/verify-intent";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing intent id" }, { status: 400 });
    }

    const result = await verifyIntentById(id);

    if (!result.ok && (result as any).notFound) {
      return NextResponse.json({ ok: false, error: "Intent not found" }, { status: 404 });
    }

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: (result as any).error || "Verify failed" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected verifier error" },
      { status: 500 }
    );
  }
}

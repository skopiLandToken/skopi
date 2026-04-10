import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const refCode = typeof body?.refCode === "string" ? body.refCode.trim().toUpperCase() : "";
    const sessionKey = typeof body?.sessionKey === "string" ? body.sessionKey.trim() : "";
    const landingPath = typeof body?.landingPath === "string" ? body.landingPath : null;

    if (!refCode || !sessionKey) {
      return NextResponse.json({ ok: false, error: "Missing refCode or sessionKey" }, { status: 400 });
    }

    const firstTouch = body?.firstTouch && typeof body.firstTouch === "object" ? body.firstTouch : {};
    const lastTouch = body?.lastTouch && typeof body.lastTouch === "object" ? body.lastTouch : {};

    const touch = { ...firstTouch, ...lastTouch };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const userAgent = req.headers.get("user-agent") || null;

    const { error } = await supabase
      .from("affiliate_link_clicks")
      .upsert(
        {
          ref_code: refCode,
          session_key: sessionKey,
          landing_path: landingPath,
          referrer: typeof touch.referrer === "string" ? touch.referrer : null,
          utm_source: typeof touch.source === "string" ? touch.source : null,
          utm_medium: typeof touch.medium === "string" ? touch.medium : null,
          utm_campaign: typeof touch.campaign === "string" ? touch.campaign : null,
          utm_content: typeof touch.content === "string" ? touch.content : null,
          utm_term: typeof touch.term === "string" ? touch.term : null,
          user_agent: userAgent,
        },
        {
          onConflict: "ref_code,session_key",
          ignoreDuplicates: true,
        }
      );

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

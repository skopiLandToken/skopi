import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminReadToken = process.env.ADMIN_READ_TOKEN;

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function GET(req: Request) {
  try {
    if (!adminReadToken) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_READ_TOKEN is not configured" },
        { status: 500 }
      );
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token || token !== adminReadToken) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = (url.searchParams.get("status") || "all").toLowerCase();
    const source = (url.searchParams.get("source") || "").trim();

    let query = supabase
      .from("purchase_intents")
      .select(
        "id,status,amount_usdc_atomic,wallet_address,reference_pubkey,tx_signature,ft_utm_source,ft_utm_campaign,created_at,updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (["created", "confirmed", "expired", "failed", "pending"].includes(status)) {
      query = query.eq("status", status);
    }

    if (source) {
      query = query.eq("ft_utm_source", source);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, intents: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}

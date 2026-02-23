import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function AffiliatePage() {
  // NOTE: this assumes you already have auth wired so the user's access token is available in cookies.
  // If you are not using cookies/session yet, we’ll switch this to "paste token" mode later.
  const cookieStore = cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value || "";

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });

  // Get current user
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    return (
      <main style={{ padding: 24, maxWidth: 760 }}>
        <h1>Affiliate</h1>
        <p>You must be logged in to see your affiliate link.</p>
      </main>
    );
  }

  // Load affiliate record
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("ref_code,created_at")
    .eq("user_id", userId)
    .single();

  const refCode = affiliate?.ref_code || "";
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://app.skopi.io";
  const refLink = refCode ? `${baseUrl}/sale?ref=${refCode}` : "";

  return (
    <main style={{ padding: 24, maxWidth: 760 }}>
      <h1 style={{ margin: 0 }}>Affiliate Dashboard</h1>
      <p style={{ marginTop: 8, opacity: 0.85 }}>
        Your referral link (share it to earn commissions).
      </p>

      <div style={{ marginTop: 16, padding: 16, border: "1px solid #ddd", borderRadius: 14 }}>
        <div><b>Your ref code:</b> {refCode || "—"}</div>

        <div style={{ marginTop: 10 }}><b>Your link:</b></div>
        <div style={{ fontFamily: "monospace", wordBreak: "break-all", background: "#f6f6f6", padding: 10, borderRadius: 8 }}>
          {refLink || "—"}
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
        <b>Next:</b> we’ll add your stats (clicks, referred purchases, commissions, payouts) after the auto-create trigger is live.
      </div>
    </main>
  );
}

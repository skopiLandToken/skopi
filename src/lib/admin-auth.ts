import { createClient } from "@supabase/supabase-js";

const adminReadToken = process.env.ADMIN_READ_TOKEN;
const adminAllowlist = (process.env.ADMIN_ALLOWLIST_EMAILS || "")
  .split(",")
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function isAdminAuthorized(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  // Legacy token auth (MVP fallback)
  if (adminReadToken && bearer && bearer === adminReadToken) return true;

  // Supabase user-based allowlist auth
  if (!bearer || !supabaseUrl || !supabaseAnonKey || adminAllowlist.length === 0) return false;

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.getUser(bearer);
    if (error || !data?.user) return false;
    const email = (data.user.email || "").toLowerCase();
    return !!email && adminAllowlist.includes(email);
  } catch {
    return false;
  }
}

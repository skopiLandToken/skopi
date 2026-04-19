import { supabaseServer } from "@/lib/supabase-server";
import { Container, Card, Button } from "../components/ui";
import WalletStatusBadge from "../components/wallet-status-badge";

export const dynamic = "force-dynamic";

type PartnerRow = {
  id: string;
  user_id: string;
  referral_code: string;
  parent_ref_code: string | null;
  auto_enrolled: boolean | null;
  tax_status: string | null;
  total_paid_usdc: number | null;
  created_at: string;
  updated_at: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default async function ProfilePage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user?.id) {
    return (
      <Container>
        <Card title="Profile" subtitle="You must be logged in to view your profile.">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button href="/login">Login</Button>
            <Button href="/sale" variant="secondary">Go to Sale</Button>
          </div>
        </Card>
      </Container>
    );
  }

  const { data: partner } = await supabase
    .from("marketing_partners")
    .select("id,user_id,referral_code,parent_ref_code,auto_enrolled,tax_status,total_paid_usdc,created_at,updated_at")
    .eq("user_id", user.id)
    .single<PartnerRow>();

  return (
    <Container>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <h1 style={{ margin: 0 }}>Profile</h1>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            Account and marketing partner details.
          </div>
        </div>

        <WalletStatusBadge />

        <Card title="Account">
          <div style={{ display: "grid", gap: 10 }}>
            <div><strong>Email:</strong> {user.email || "—"}</div>
            <div style={{ wordBreak: "break-all" }}><strong>User ID:</strong> {user.id}</div>
            <div><strong>Created:</strong> {formatDateTime(user.created_at)}</div>
            <div><strong>Last Sign In:</strong> {formatDateTime(user.last_sign_in_at)}</div>
          </div>
        </Card>

        <Card title="Marketing Partner Details">
          {partner ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div><strong>Referral Code:</strong> {partner.referral_code}</div>
              <div><strong>Parent Code:</strong> {partner.parent_ref_code || "—"}</div>
              <div><strong>Auto Enrolled:</strong> {partner.auto_enrolled ? "Yes" : "No"}</div>
              <div><strong>Tax Status:</strong> {partner.tax_status || "—"}</div>
              <div><strong>Total Paid USDC:</strong> ${Number(partner.total_paid_usdc || 0).toFixed(2)}</div>
              <div><strong>Partner Created:</strong> {formatDateTime(partner.created_at)}</div>
            </div>
          ) : (
            <div>No marketing partner record found yet.</div>
          )}
        </Card>

        <Card title="Quick Actions">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button href="/marketing-partners" variant="secondary">Marketing Partner Dashboard</Button>
            <Button href="/me/purchases" variant="secondary">My Purchases</Button>
            <Button href="/sale" variant="secondary">Sale</Button>
            <Button href="/logout">Logout</Button>
          </div>
        </Card>
      </div>
    </Container>
  );
}

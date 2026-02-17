import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type AuditInput = {
  action: string;
  actor?: string | null;
  campaign_id?: string | null;
  task_id?: string | null;
  submission_id?: string | null;
  allocation_id?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAirdropAudit(input: AuditInput) {
  try {
    await supabase.from("airdrop_audit_log").insert({
      action: input.action,
      actor: input.actor || null,
      campaign_id: input.campaign_id || null,
      task_id: input.task_id || null,
      submission_id: input.submission_id || null,
      allocation_id: input.allocation_id || null,
      metadata: input.metadata || {},
    });
  } catch {
    // Non-blocking by design
  }
}

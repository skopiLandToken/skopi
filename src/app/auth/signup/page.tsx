"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import SignupInner from "./signup-inner";

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <SignupInner />
    </Suspense>
  );
}

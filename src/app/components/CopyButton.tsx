"use client";

import { useState } from "react";
import { Button } from "./ui";

export default function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [msg, setMsg] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setMsg("Copied ✅");
      setTimeout(() => setMsg(null), 1200);
    } catch {
      setMsg("Copy failed");
      setTimeout(() => setMsg(null), 1200);
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
      <Button onClick={copy} variant="secondary" title="Copy to clipboard">
        {label}
      </Button>
      {msg ? <span style={{ fontSize: 12, opacity: 0.8 }}>{msg}</span> : null}
    </span>
  );
}

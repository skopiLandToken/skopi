
import React from "react";

export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      {children}
    </div>
  );
}

export function Card({
  children,
  title,
  subtitle,
  right,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid #e6e6e6",
        borderRadius: 16,
        background: "#fff",
        padding: 16,
      }}
    >
      {(title || subtitle || right) ? (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <div>
            {title ? <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div> : null}
            {subtitle ? <div style={{ marginTop: 4, opacity: 0.8, fontSize: 13 }}>{subtitle}</div> : null}
          </div>
          {right ? <div>{right}</div> : null}
        </div>
      ) : null}

      <div style={{ marginTop: title || subtitle || right ? 12 : 0 }}>
        {children}
      </div>
    </section>
  );
}

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  disabled,
  title,
  type = "button",
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: (e?: any) => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 12,
    textDecoration: "none",
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    userSelect: "none",
    border: "1px solid #111",
    opacity: disabled ? 0.6 : 1,
  };

  const styles: Record<string, React.CSSProperties> = {
    primary: { ...base, background: "#111", color: "#fff" },
    secondary: { ...base, background: "#fff", color: "#111", border: "1px solid #ddd" },
    ghost: { ...base, background: "transparent", color: "#111", border: "1px solid transparent" },
  };

  if (href) {
    return (
      <a href={href} style={styles[variant]} aria-disabled={disabled ? "true" : "false"} title={title}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} style={styles[variant]} title={title}>
      {children}
    </button>
  );
}

export function Pill({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid #e6e6e6",
        fontSize: 12,
        opacity: 0.85,
      }}
    >
      {text}
    </span>
  );
}

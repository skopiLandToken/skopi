import React from "react";

export function Container({ children }: { children: React.ReactNode }) {
  return <div className="container">{children}</div>;
}

export function Card({
  children,
  title,
  subtitle,
  right,
  elevated = false,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  elevated?: boolean;
}) {
  return (
    <section className={`card ${elevated ? "card--elevated" : ""}`}>
      {(title || subtitle || right) ? (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <div>
            {title ? <div className="card-title">{title}</div> : null}
            {subtitle ? <div className="card-subtitle">{subtitle}</div> : null}
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
  const cls = `btn btn-${variant}`;

  if (href) {
    const style: React.CSSProperties | undefined = disabled
      ? { pointerEvents: "none", opacity: 0.55 }
      : undefined;

    return (
      <a
        href={href}
        className={cls}
        aria-disabled={disabled ? "true" : "false"}
        title={title}
        style={style}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls}
      title={title}
    >
      {children}
    </button>
  );
}

export function Pill({ text }: { text: string }) {
  return <span className="pill">{text}</span>;
}

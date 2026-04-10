"use client";

import { useEffect, useMemo, useState } from "react";

function fmtNum(n: number, max = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: max,
  }).format(n);
}

function buyerPositionMeta(position: number) {
  if (position >= 1 && position <= 50) return { label: "1–50", positionBonus: 100, cap: 200 };
  if (position >= 51 && position <= 100) return { label: "51–100", positionBonus: 75, cap: 175 };
  if (position >= 101 && position <= 200) return { label: "101–200", positionBonus: 50, cap: 150 };
  if (position >= 201 && position <= 350) return { label: "201–350", positionBonus: 35, cap: 125 };
  if (position >= 351 && position <= 500) return { label: "351–500", positionBonus: 25, cap: 100 };
  return { label: "501+", positionBonus: 0, cap: 25 };
}

function purchaseBonus(amount: number) {
  if (amount >= 500000) return 75;
  if (amount >= 250000) return 70;
  if (amount >= 100000) return 65;
  if (amount >= 75000) return 60;
  if (amount >= 50000) return 55;
  if (amount >= 35000) return 50;
  if (amount >= 25000) return 45;
  if (amount >= 15000) return 40;
  if (amount >= 10000) return 35;
  if (amount >= 5000) return 30;
  if (amount >= 2500) return 25;
  if (amount >= 1000) return 20;
  return 0;
}

function lockupBonus(lockup: string) {
  if (lockup === "12") return 20;
  if (lockup === "6") return 10;
  return 0;
}

export default function SaleClient({ refCode, nextBuyerPosition }: { refCode?: string; nextBuyerPosition: number }) {
  const [amount, setAmount] = useState("10");
  const [lockup, setLockup] = useState("none");

  const amountNum = Math.max(0, Number(amount) || 0);
  const buyerNum = Math.max(1, Number(nextBuyerPosition) || 1);

  const calc = useMemo(() => {
    const price = 0.10;
    const baseTokens = amountNum / price;

    const pos = buyerPositionMeta(buyerNum);
    const purchase = purchaseBonus(amountNum);
    const lock = lockupBonus(lockup);

    const rawBonus = pos.positionBonus + purchase + lock;
    const finalBonus = Math.min(rawBonus, pos.cap);

    const bonusTokens = baseTokens * (finalBonus / 100);
    const totalTokens = baseTokens + bonusTokens;
    const effectivePricePerToken = totalTokens > 0 ? amountNum / totalTokens : 0;
    const effectiveDiscountPct = price > 0 ? ((price - effectivePricePerToken) / price) * 100 : 0;

    return {
      price,
      pos,
      purchase,
      lock,
      rawBonus,
      finalBonus,
      baseTokens,
      bonusTokens,
      totalTokens,
      effectivePricePerToken,
      effectiveDiscountPct,
    };
  }, [amountNum, buyerNum, lockup]);

  const href = `/buy?amount=${encodeURIComponent(amountNum || 0)}${refCode ? `&ref=${encodeURIComponent(refCode)}` : ""}`;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section
        style={{
          border: "1px solid rgba(255,255,255,.10)",
          borderRadius: 20,
          padding: 20,
          background: "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02))",
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <div
            style={{
              display: "inline-block",
              width: "fit-content",
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(212,175,55,.40)",
              background: "rgba(212,175,55,.14)",
              color: "#f3d36b",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Public Sale
          </div>

          <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.05 }}>Buy SKOpi</h1>
          <div style={{ opacity: 0.86, maxWidth: 860 }}>
            SKOpi public sale price is <strong>$0.10 per token</strong>. Choose a preset amount or enter your own custom amount. The estimate below shows your purchased tokens, projected bonus tokens, and estimated total allocation based on the current open confirmed-buyer position.
          </div>
        </div>
      </section>

      <section
        style={{
          border: "1px solid rgba(255,255,255,.10)",
          borderRadius: 18,
          padding: 18,
          background: "rgba(255,255,255,.02)",
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 20 }}>Choose your purchase amount</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[10, 25, 100, 200].map((value) => (
            <button
              key={value}
              onClick={() => setAmount(String(value))}
              style={{
                border: "1px solid rgba(255,255,255,.12)",
                background: amountNum === value ? "rgba(34,211,238,.18)" : "rgba(255,255,255,.03)",
                color: "inherit",
                borderRadius: 12,
                padding: "10px 14px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ${value}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>Custom amount (USDC)</div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="Enter amount"
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.12)",
                background: "#0f172a",
                color: "#ffffff",
                padding: "12px 14px",
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>Current open bonus position</div>
            <div
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.03)",
                color: "inherit",
                padding: "12px 14px",
                fontWeight: 800,
              }}
            >
              #{nextBuyerPosition} <span style={{ opacity: 0.7, fontWeight: 500 }}>({calc.pos.label} band)</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>Lockup</div>
            <select
              value={lockup}
              onChange={(e) => setLockup(e.target.value)}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.12)",
                background: "#0f172a",
                color: "#ffffff",
                padding: "12px 14px",
              }}
            >
              <option value="none" style={{ background: "#0f172a", color: "#ffffff" }}>No lockup</option>
              <option value="6" style={{ background: "#0f172a", color: "#ffffff" }}>6 months (+10%)</option>
              <option value="12" style={{ background: "#0f172a", color: "#ffffff" }}>12 months (+20%)</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href={href}
            style={{
              textDecoration: "none",
              borderRadius: 12,
              padding: "12px 16px",
              fontWeight: 800,
              background: "linear-gradient(90deg, #d946ef, #22d3ee)",
              color: "white",
            }}
          >
            Continue to Buy
          </a>

          <div style={{ alignSelf: "center", fontSize: 12, opacity: 0.72 }}>
            Ref code carries through automatically if present.
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <div style={{ border: "1px solid rgba(255,255,255,.10)", borderRadius: 16, padding: 16, background: "rgba(255,255,255,.02)" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Base SKOpi</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{fmtNum(calc.baseTokens, 2)}</div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,.10)", borderRadius: 16, padding: 16, background: "rgba(255,255,255,.02)" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Estimated bonus %</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{fmtNum(calc.finalBonus, 0)}%</div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,.10)", borderRadius: 16, padding: 16, background: "rgba(255,255,255,.02)" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Estimated bonus tokens</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{fmtNum(calc.bonusTokens, 2)}</div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,.10)", borderRadius: 16, padding: 16, background: "rgba(255,255,255,.02)" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Estimated total tokens</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{fmtNum(calc.totalTokens, 2)}</div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,.10)", borderRadius: 16, padding: 16, background: "rgba(255,255,255,.02)" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Effective price / token</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>${fmtNum(calc.effectivePricePerToken, 4)}</div>
        </div>
      </section>

      <section
        style={{
          border: "1px solid rgba(212,175,55,.20)",
          borderRadius: 16,
          padding: 16,
          background: "rgba(212,175,55,.06)",
          display: "grid",
          gap: 6,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900 }}>
          Bonus impact
        </div>
        <div style={{ opacity: 0.88 }}>
          Base sale price is <strong>$0.10</strong> per token. With your current projected bonus, your estimated effective price improves to{" "}
          <strong>${fmtNum(calc.effectivePricePerToken, 4)}</strong> per token.
        </div>
        <div style={{ fontSize: 14, opacity: 0.78 }}>
          Estimated improvement: <strong>{fmtNum(calc.effectiveDiscountPct, 2)}%</strong> versus the base sale price.
        </div>
      </section>

      <section
        style={{
          border: "1px solid rgba(34,211,238,.20)",
          borderRadius: 18,
          padding: 18,
          background: "rgba(34,211,238,.05)",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 900 }}>Current bonus details</div>
        <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
          <div><strong>Buyer position band:</strong> {calc.pos.label}</div>
          <div><strong>Position bonus:</strong> {calc.pos.positionBonus}%</div>
          <div><strong>Purchase bonus:</strong> {calc.purchase}%</div>
          <div><strong>Lockup bonus:</strong> {calc.lock}%</div>
          <div><strong>Raw bonus:</strong> {calc.rawBonus}%</div>
          <div><strong>Position cap:</strong> {calc.pos.cap}%</div>
          <div><strong>Final applied bonus:</strong> {calc.finalBonus}%</div>
        </div>
      </section>

      <section
        style={{
          border: "1px solid rgba(255,255,255,.10)",
          borderRadius: 18,
          padding: 18,
          background: "rgba(255,255,255,.02)",
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900 }}>Bonus Program Overview</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <div style={{ border: "1px solid rgba(34,211,238,.28)", borderRadius: 16, padding: 16, background: "rgba(34,211,238,.09)", boxShadow: "0 0 0 1px rgba(34,211,238,.06) inset" }}>
            <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 16 }}>Current live position</div>
            <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>#{nextBuyerPosition}</div>
            <div style={{ fontSize: 14, lineHeight: 1.8 }}>
              Band: <strong>{calc.pos.label}</strong><br />
              Position bonus: <strong>{calc.pos.positionBonus}%</strong><br />
              Position cap: <strong>{calc.pos.cap}%</strong>
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Purchase bonus ladder</div>
            <div style={{ fontSize: 14, lineHeight: 1.8 }}>
              $1,000+ → 20%<br />
              $2,500+ → 25%<br />
              $5,000+ → 30%<br />
              $10,000+ → 35%<br />
              $25,000+ → 45%<br />
              $50,000+ → 55%<br />
              $100,000+ → 65%<br />
              $250,000+ → 70%<br />
              $500,000+ → 75%
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Lockup effect</div>
            <div style={{ fontSize: 14, lineHeight: 1.8 }}>
              No lockup → 0%<br />
              6 months → +10%<br />
              12 months → +20%
            </div>
            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.76 }}>
              Lockup applies to your total estimated allocation, including projected bonus tokens.
            </div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(212,175,55,.20)",
            borderRadius: 14,
            padding: 14,
            background: "rgba(212,175,55,.06)",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Why hold?</div>
          <div style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.9 }}>
            Buyers who choose a lockup strengthen their total allocation and reduce their effective token cost.
            That creates a stronger incentive to hold rather than flip immediately, especially while early-position
            and community bonus inventory is still available.
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.6 }}>
          Final bonus = position bonus + purchase bonus + lockup bonus, capped by buyer-position max.
          Current open position is estimated from confirmed purchases and may shift before your payment is fully confirmed.
          Bonus inventory is finite and may be reduced or exhausted.
        </div>
      </section>
    </div>
  );
}

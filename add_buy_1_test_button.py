from pathlib import Path

TARGET = Path("src/app/sale/page.tsx")

def main():
    s = TARGET.read_text(encoding="utf-8")

    # If we've already added it, don't duplicate.
    if "Buy $1 (test)" in s:
        print("✅ $1 test button already present. No changes made.")
        return

    # Insert a small Quick Test card after the first <h1 ...>Sale...</h1> occurrence.
    insert = r"""
      <div style={{ marginTop: 12 }}>
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <div>
              <div className="card-title">Quick test</div>
              <div className="card-subtitle">Create a $1 purchase intent for fast testing.</div>
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/buy?amount=1" className="btn btn-primary">Buy $1 (test)</a>
            <a href="/buy?amount=10" className="btn btn-secondary">Buy $10</a>
          </div>
        </section>
      </div>
"""

    # Try to place it after the main page heading block
    # Common patterns: <h1>Sale</h1> or <h1 ...>Sale</h1>
    import re
    m = re.search(r"<h1[^>]*>\s*Sale\s*</h1>", s)
    if not m:
        # fallback: insert after first occurrence of "<main" content container
        m2 = re.search(r"<main[^>]*>", s)
        if not m2:
            raise RuntimeError("Could not find a safe insertion point in src/app/sale/page.tsx")
        idx = m2.end()
        s2 = s[:idx] + insert + s[idx:]
    else:
        idx = m.end()
        s2 = s[:idx] + insert + s[idx:]

    TARGET.write_text(s2, encoding="utf-8")
    print(f"✅ Added Buy $1 (test) section to {TARGET}")

if __name__ == "__main__":
    main()

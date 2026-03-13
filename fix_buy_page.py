from pathlib import Path

TARGET = Path("src/app/buy/page.tsx")

TSX = r"""import BuyClient from "./buy-client";

export const dynamic = "force-dynamic";

export default function BuyPage() {
  return <BuyClient />;
}
"""

def main():
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(TSX, encoding="utf-8")
    print(f"✅ Overwrote {TARGET}")

if __name__ == "__main__":
    main()

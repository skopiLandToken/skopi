from pathlib import Path

TARGET = Path("src/app/receipt/[id]/page.tsx")

TSX = r"""import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// This route is unreliable in our current Next/Vercel build (params come through empty).
// So we always redirect to the query-param receipt page which works reliably.
export default function ReceiptLegacyRedirect({ params }: { params: { id?: string } }) {
  const id = (params && (params as any).id) ? String((params as any).id) : "";
  if (id && id !== "undefined") {
    redirect(`/receipt?id=${encodeURIComponent(id)}`);
  }
  redirect("/sale");
}
"""

def main():
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(TSX, encoding="utf-8")
    print(f"✅ Overwrote {TARGET}")

if __name__ == "__main__":
    main()

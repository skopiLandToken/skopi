from pathlib import Path
import re

TARGET = Path("src/middleware.ts")

def main():
    s = TARGET.read_text(encoding="utf-8")

    if "receiptRedirect" in s or "Redirect legacy /receipt/<id>" in s:
        print("✅ Middleware redirect already present. No changes made.")
        return

    # Insert redirect block near the top of middleware(req)
    needle = "export async function middleware(req: NextRequest) {"
    i = s.find(needle)
    if i == -1:
        raise RuntimeError("Could not find middleware() in src/middleware.ts")

    # Find where `const res = NextResponse.next();` is so we can place redirect after it
    j = s.find("const res = NextResponse.next()", i)
    if j == -1:
        raise RuntimeError("Could not find `const res = NextResponse.next()` in middleware")

    # Find end of that line
    j_end = s.find("\n", j)
    if j_end == -1:
        raise RuntimeError("Unexpected file format")

    insert = """
  // Redirect legacy receipt path /receipt/<uuid> -> /receipt?id=<uuid>
  // We do this here because Next params are unreliable for /receipt/[id] in this build.
  const path = req.nextUrl.pathname;
  const m = path.match(/^\\/receipt\\/([0-9a-fA-F-]{36})$/);
  if (m) {
    const url = req.nextUrl.clone();
    url.pathname = "/receipt";
    url.searchParams.set("id", m[1]);
    return NextResponse.redirect(url);
  }
"""

    out = s[:j_end+1] + insert + s[j_end+1:]
    TARGET.write_text(out, encoding="utf-8")
    print(f"✅ Patched {TARGET} to redirect /receipt/<uuid> to /receipt?id=<uuid>")

if __name__ == "__main__":
    main()

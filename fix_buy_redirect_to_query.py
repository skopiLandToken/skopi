from pathlib import Path

TARGET = Path("src/app/buy/buy-client.tsx")

# This assumes your current buy-client already creates intentId correctly.
# We only change the final redirect to /receipt?id=...
def main():
    txt = TARGET.read_text(encoding="utf-8")
    txt2 = txt.replace('router.push(`/receipt/${intentId}`);', 'router.push(`/receipt?id=${intentId}`);')
    if txt2 == txt:
        # fallback: if formatting differs, do a safer replace
        txt2 = txt.replace("router.push(`/receipt/${intentId}`)", "router.push(`/receipt?id=${intentId}`)")
    TARGET.write_text(txt2, encoding="utf-8")
    print(f"✅ Updated redirect in {TARGET}")

if __name__ == "__main__":
    main()

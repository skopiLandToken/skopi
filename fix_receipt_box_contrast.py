from pathlib import Path

TARGET = Path("src/app/receipt/page.tsx")

def main():
    txt = TARGET.read_text(encoding="utf-8")

    # Replace the light box background with a dark one + readable text
    txt = txt.replace('background: "#f6f6f6"', 'background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.92)", border: "1px solid rgba(255,255,255,0.10)"')

    TARGET.write_text(txt, encoding="utf-8")
    print(f"✅ Updated contrast in {TARGET}")

if __name__ == "__main__":
    main()

from pathlib import Path

TARGET = Path("src/app/receipt/components/pay-phantom-button.tsx")

def main():
    s = TARGET.read_text(encoding="utf-8")
    if "/api/purchase-intents/" in s and "set-payer" in s:
        print("✅ pay button already sets payer. No changes.")
        return

    # Insert right after provider.connect() succeeds.
    needle = "const { publicKey } = await provider.connect();"
    idx = s.find(needle)
    if idx == -1:
        raise RuntimeError("Could not find provider.connect() line in pay-phantom-button.tsx")

    insert = """const { publicKey } = await provider.connect();
      // Save payer wallet on the intent (so we can deliver/claim SKOPI later)
      try {
        await fetch(`/api/purchase-intents/${props.intentId}/set-payer`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ payer: publicKey.toBase58() }),
        });
      } catch {}
"""

    s2 = s.replace(needle, insert, 1)
    TARGET.write_text(s2, encoding="utf-8")
    print(f"✅ Patched {TARGET} to set payer_pubkey after wallet connect")

if __name__ == "__main__":
    main()

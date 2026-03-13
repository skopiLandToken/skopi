from pathlib import Path

TARGET = Path("src/app/receipt/page.tsx")

def main():
    s = TARGET.read_text(encoding="utf-8")

    # 1) Ensure import exists
    if 'from "./components/claim-skopi-button"' not in s:
        s = s.replace(
            'import VerifyButton from "./components/verify-button";',
            'import VerifyButton from "./components/verify-button";\nimport ClaimSkopiButton from "./components/claim-skopi-button";'
        )

    # 2) Ensure the Supabase select includes claim fields
    # Find the select("...") string and add fields if missing
    if "payer_pubkey" not in s or "skopi_claimed_at" not in s or "skopi_tx_signature" not in s:
        s = s.replace(
            'select("id,status,tranche_id,price_usdc_used,tokens_skopi,amount_usdc_atomic,reference_pubkey,created_at,confirmed_at,tx_signature,failure_reason,updated_at")',
            'select("id,status,tranche_id,price_usdc_used,tokens_skopi,amount_usdc_atomic,reference_pubkey,created_at,confirmed_at,tx_signature,failure_reason,updated_at,payer_pubkey,skopi_claimed_at,skopi_tx_signature")'
        )

    # 3) Add a "Step 3 — Claim SKOPI" card after Verify card if confirmed
    marker = '        <Card title={undefined} subtitle={undefined} right={stepHeader(2, "Verify on-chain")}>'
    if marker not in s:
        raise RuntimeError("Could not find Verify card in receipt page (marker not found).")

    # Insert AFTER the Verify card closing tag. We'll match the next occurrence of '</Card>' after that marker.
    start = s.find(marker)
    end = s.find("</Card>", start)
    if end == -1:
        raise RuntimeError("Could not find end of Verify card in receipt page.")
    end = end + len("</Card>")

    insert = r"""

        <Card title={undefined} subtitle={undefined} right={stepHeader(3, "Claim SKOPI")}>
          {!isConfirmed ? (
            <div style={{ opacity: 0.85 }}>
              Claim is available after your payment is confirmed.
            </div>
          ) : intent.skopi_claimed_at ? (
            <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(0,255,140,0.35)", background: "rgba(0,255,140,0.08)" }}>
              <div style={{ fontWeight: 900 }}>Claimed ✅</div>
              <div style={{ marginTop: 6, opacity: 0.85 }}>
                SKOPI has been sent to your wallet.
              </div>
              {intent.skopi_tx_signature ? (
                <div style={{ marginTop: 10, fontFamily: "monospace", wordBreak: "break-all", opacity: 0.85 }}>
                  skopi tx: {String(intent.skopi_tx_signature)}
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ opacity: 0.85 }}>
                Click Claim to receive your SKOPI tokens in your connected wallet.
              </div>
              <ClaimSkopiButton intentId={intent.id} />
            </div>
          )}
        </Card>
"""

    if "right={stepHeader(3, \"Claim SKOPI\")}" not in s:
        s = s[:end] + insert + s[end:]

    TARGET.write_text(s, encoding="utf-8")
    print(f"✅ Updated {TARGET} to show Claim SKOPI step")

if __name__ == "__main__":
    main()

import json
from pathlib import Path

metadata = {
    "name": "SKOpi",
    "symbol": "SKOPI",
    "description": "SKOpi is a utility token powering SKOpi.io — with transparent, on-chain proof for supply, allocations, and redemption-ready inventory credits.",
    "image": "https://app.skopi.io/skopi-coin.png",
    "external_url": "https://skopi.io",
    "extensions": {
        "website": "https://skopi.io",
        "twitter": "https://x.com/skopi_coin",
        "telegram": "https://t.me/skopicoin",
        "discord": "https://discord.gg/nKmzdj8c"
    },
    "properties": {
        "category": "image",
        "files": [
            {
                "uri": "https://app.skopi.io/skopi-coin.png",
                "type": "image/png"
            }
        ]
    }
}

output_file = Path("skopi.json")

with output_file.open("w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)

print(f"Wrote metadata to {output_file.resolve()}")

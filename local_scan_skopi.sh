#!/usr/bin/env bash
set -euo pipefail

REPO="$HOME/.openclaw/workspace/projects/skopi"
cd "$REPO"

# 1) file list
find . -type f \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -not -path "./.next/*" \
  -not -path "./dist/*" \
  -not -path "./build/*" \
  -not -name "*.map" \
  -not -name "*.lock" \
  | sed 's|^\./||' | sort > .openclaw_filelist.txt

# 2) keyword hits (keep it bounded)
rg -n "gamma|landing|homepage|hero|tagline|copy|marketing|token|SKOpi" . \
  --hidden --glob '!.git/*' --glob '!node_modules/*' \
  --glob '!.next/*' --glob '!dist/*' --glob '!build/*' \
  | head -n 3000 > .openclaw_grep_hits.txt || true

# 3) pick candidate files from hit lines
python3 - <<'PY'
from pathlib import Path
hits = Path(".openclaw_grep_hits.txt").read_text(errors="ignore").splitlines()
paths = []
for line in hits:
    if ":" in line:
        p = line.split(":",1)[0].strip()
        if p and p not in paths:
            paths.append(p)

# rank files that look like homepage/landing/copy
kw = ("gamma","landing","homepage","home","hero","tagline","marketing","copy","readme","docs")
ranked = sorted(paths, key=lambda p: sum(k in p.lower() for k in kw), reverse=True)

# keep top N
top = ranked[:15]
Path(".openclaw_candidate_files.txt").write_text("\n".join(top) + ("\n" if top else ""))
print("Candidates:", len(top))
PY

# 4) Summarize using local Llama (Ollama)
OUT="PROJECT_MEMORY_LOCAL.md"
{
  echo "# SKOpi Project Memory (LOCAL, from repo scan)"
  echo
  echo "## Candidate files (from keyword hits)"
  if [ -s .openclaw_candidate_files.txt ]; then
    sed 's/^/- /' .openclaw_candidate_files.txt
  else
    echo "- (No candidates found from grep hits)"
  fi
  echo
  echo "## Local summary (llama3.1:8b)"
  echo
} > "$OUT"

# build a compact context bundle for the model
python3 - <<'PY'
from pathlib import Path
repo = Path(".")
cand = repo/".openclaw_candidate_files.txt"
out = repo/".openclaw_context_bundle.txt"
paths = [p.strip() for p in cand.read_text(errors="ignore").splitlines() if p.strip()] if cand.exists() else []
chunks = []
for p in paths:
    fp = repo/p
    if fp.exists() and fp.is_file():
        txt = fp.read_text(errors="ignore")
        # cap each file snippet
        txt = txt[:6000]
        chunks.append(f"\n=== FILE: {p} ===\n{txt}\n")
bundle = "\n".join(chunks)
# hard cap total bundle
out.write_text(bundle[:45000])
print("Bundle chars:", len(bundle[:45000]))
PY

PROMPT=$(cat <<'EOF'
You are scanning a repo for homepage/landing/Gamma-related content.
Return a SHORT structured summary (max ~6,000 chars) with:
- What this repo is (1 paragraph)
- Homepage/landing/Gamma related files (bullets with paths)
- Any literal hero/headline/CTA copy you can see (bullets; quote short phrases only)
- Next steps checklist (5-10 bullets)
Do NOT invent anything you can't see.
EOF
)

# Run ollama once on the compact bundle
ollama run llama3.1:8b "$(printf "%s\n\n---\nCONTEXT:\n%s\n" "$PROMPT" "$(cat .openclaw_context_bundle.txt)")" \
  >> "$OUT"

echo "WROTE: $REPO/$OUT"

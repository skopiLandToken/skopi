import fs from "node:fs";

const path = "src/app/buy/page.tsx";
if (!fs.existsSync(path)) {
  console.error(`File not found: ${path}`);
  process.exit(1);
}

let src = fs.readFileSync(path, "utf8");

// If we've already patched, exit cleanly
if (src.includes('authorization: `Bearer ${token}`')) {
  console.log("✅ buy/page.tsx already has Authorization header patch.");
  process.exit(0);
}

// Basic heuristic: find fetch("/api/purchase-intents" and add auth header
// We look for a fetch call that posts to /api/purchase-intents and has headers object.
const re = /fetch\(\s*["'`]\/api\/purchase-intents["'`]\s*,\s*\{\s*method:\s*["'`]POST["'`]\s*,\s*headers:\s*\{([\s\S]*?)\}\s*,\s*body:\s*JSON\.stringify\(([\s\S]*?)\)\s*\}\s*\)/m;

const m = src.match(re);
if (!m) {
  console.error("❌ Could not find the POST fetch('/api/purchase-intents', { method:'POST', headers:{...}, body:JSON.stringify(...) }) block.");
  console.error("Paste your buy/page.tsx call site here and I’ll generate a perfect patch.");
  process.exit(1);
}

// Inject token acquisition just above the fetch, if we can find a nearby 'const res = await fetch(' line.
// If not, we will inject token acquisition at top of the function that contains it.
const fetchStartIdx = src.indexOf(m[0]);
const before = src.slice(0, fetchStartIdx);
const after = src.slice(fetchStartIdx);

// Try to locate the nearest function start above fetch
const fnIdx = before.lastIndexOf("async function");
const insertIdx = fnIdx !== -1 ? before.indexOf("{", fnIdx) + 1 : fetchStartIdx;

// Add token acquisition snippet
const tokenSnippet = `
  // --- SKOpi auth patch: attach Supabase access token to API request ---
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) {
    throw new Error("Not logged in (missing Supabase access token).");
  }
  // --- end auth patch ---
`;

let patched = src;
patched = patched.slice(0, insertIdx) + tokenSnippet + patched.slice(insertIdx);

// Now patch headers to include authorization
patched = patched.replace(re, (full, headersInside, bodyExpr) => {
  // Ensure content-type remains and add authorization line
  const headers = headersInside.trim();
  // Avoid duplicating commas weirdly
  const newHeaders = headers.length
    ? headers + `,\n      authorization: \`Bearer \${token}\``
    : `\n      authorization: \`Bearer \${token}\``;

  return `fetch("/api/purchase-intents", {\n    method: "POST",\n    headers: {${newHeaders}\n    },\n    body: JSON.stringify(${bodyExpr.trim()}),\n  })`;
});

fs.writeFileSync(path, patched, "utf8");
console.log("✅ Patched buy/page.tsx: added Supabase access token + Authorization header.");

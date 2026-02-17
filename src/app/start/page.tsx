"use client";

import Link from "next/link";
import { useEffect } from "react";

function getParam(name: string) {
if (typeof window === "undefined") return null;
return new URLSearchParams(window.location.search).get(name);
}

export default function StartPage() {
useEffect(() => {
if (typeof window === "undefined") return;

const now = new Date().toISOString();

const touch = {
source: getParam("utm_source"),
medium: getParam("utm_medium"),
campaign: getParam("utm_campaign"),
content: getParam("utm_content"),
term: getParam("utm_term"),
landingPath: window.location.pathname,
referrer: document.referrer || null,
ts: now,
};

// first touch (set once)
if (!localStorage.getItem("skopi_first_touch")) {
localStorage.setItem("skopi_first_touch", JSON.stringify(touch));
}

// last touch (always update)
localStorage.setItem("skopi_last_touch", JSON.stringify(touch));
}, []);

return (
<main style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px" }}>
<h1 style={{ fontSize: 38, marginBottom: 12 }}>SKOpi Utility Portal</h1>
<p style={{ fontSize: 18, opacity: 0.85, marginBottom: 24 }}>
Utility-first access on Solana. Buy SKOpi with USDC and use it as discount credit in the ecosystem.
</p>

<section
style={{
border: "1px solid #ddd",
borderRadius: 12,
padding: 20,
marginBottom: 20,
}}
>
<h2 style={{ marginTop: 0 }}>How it works</h2>
<ol style={{ lineHeight: 1.8 }}>
<li>Get a Solana wallet (Phantom or Solflare)</li>
<li>Fund wallet with USDC on Solana</li>
<li>Create purchase intent in app</li>
<li>Send exact USDC amount</li>
<li>Receive confirmation + receipt</li>
</ol>
</section>

<section
style={{
border: "1px solid #ddd",
borderRadius: 12,
padding: 20,
marginBottom: 20,
}}
>
<h2 style={{ marginTop: 0 }}>No wallet yet?</h2>
<p>Install one first, then come back to buy.</p>
<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
<a
href="https://phantom.app/"
target="_blank"
rel="noreferrer"
style={{
padding: "10px 14px",
borderRadius: 8,
border: "1px solid #ccc",
textDecoration: "none",
}}
>
Get Phantom
</a>
<a
href="https://solflare.com/"
target="_blank"
rel="noreferrer"
style={{
padding: "10px 14px",
borderRadius: 8,
border: "1px solid #ccc",
textDecoration: "none",
}}
>
Get Solflare
</a>
</div>
</section>

<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
<Link
href="/buy"
style={{
padding: "12px 16px",
borderRadius: 8,
background: "#111",
color: "#fff",
textDecoration: "none",
}}
>
Continue to Buy
</Link>

<Link
href="/buy?utm_source=start&utm_medium=internal&utm_campaign=wallet_ready"
style={{
padding: "12px 16px",
borderRadius: 8,
border: "1px solid #ccc",
textDecoration: "none",
}}
>
I already have a wallet
</Link>
</div>
</main>
);
}

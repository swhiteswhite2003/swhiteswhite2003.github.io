# MoneyMath — Live status & how to turn on the $5/day

## ✅ ALREADY LIVE (done by Claude, free)
The site is deployed and serving on the public internet:

  **https://swhiteswhite2003.github.io/**

- Hosted free on **GitHub Pages** (repo: `swhiteswhite2003/swhiteswhite2003.github.io`), HTTPS enforced.
- All 12 calculators + homepage + legal pages live; sitemap at `/sitemap.xml`.
- Verified end-to-end on the live site: 12/12 pages compute correctly (`MM_BASE=https://swhiteswhite2003.github.io npm run e2e`).
- Google can now start indexing it. To **delete it**, just say so — `gh repo delete swhiteswhite2003.github.io`.

## ⏳ REMAINING — the money switch (needs YOU; ~15–20 min total)
Claude can't do these — they're tied to your identity, login, and payment.

1. **Submit the sitemap to Google Search Console** (5 min, FREE) — search.google.com/search-console → add `https://swhiteswhite2003.github.io/` → verify → submit `/sitemap.xml`. This is what actually starts/accelerates indexing. **Highest-leverage step. Do this first.**
2. **Apply for Google AdSense** (10 min apply, days to approve) — adsense.google.com. NOTE: AdSense usually wants a **real domain**, not a `github.io` subdomain. So to monetize you'll likely need step 3 first.
3. **(For AdSense) Buy a custom domain (~$10/yr)** and point it at this same GitHub Pages repo (Settings → Pages → Custom domain — GitHub handles the rest). Then re-run AdSense on the real domain. Tell Claude the domain and it re-points all canonical/sitemap URLs in one shot.
4. When AdSense approves → paste your `ca-pub-…` id into `assets/calc.js` → `CONFIG.adsensePublisherId`. Ad slots are already in every page, dormant until then.

---

## (Original notes — domain/host options if you ever move off GitHub Pages)
The site is plain static files, so it runs free on any static host. These are the only steps that need a human,
because they're tied to **your** identity and money. Total hands-on time: ~30–45 min, spread over a few days.

---

## The 5 steps, in order

### 1. Buy a domain (~$10/year) — 5 min
Pick a short, brandable name (calculator/finance themed). Register at **Cloudflare**, **Porkbun**, or **Namecheap**.
Then tell me the domain and I'll find-and-replace `moneymath.example` across the site in one shot.

> The brand text "MoneyMath" is in every page header + `assets/calc.js`. One command swaps it everywhere — just say the word.

### 2. Put the site online — FREE, 10 min
It's plain static files, so any static host works free. Easiest:

- **Cloudflare Pages** (recommended): create a free account → "Create a project" → upload this folder (or connect a Git repo) → done. Free SSL, fast CDN, easy custom domain.
- Alternatives: **Netlify** (drag-and-drop the folder), **GitHub Pages**, or a **Render Static Site**.

Point your domain (step 1) at it. Now the site is live at your real URL.

### 3. Submit to Google Search Console — 5 min  ⭐ THIS is what gets you traffic
- Go to **search.google.com/search-console**, add your domain, verify (DNS or HTML tag).
- Submit `https://yourdomain.com/sitemap.xml`.
- This tells Google your pages exist. Without it, indexing takes much longer. **Do not skip this.**

### 4. Apply for Google AdSense — 10 min to apply, days–weeks to approve
- Go to **adsense.google.com**, sign up with the live site URL.
- AdSense reviews the site (needs real content + a privacy policy — both already built).
- When approved you'll get a **publisher ID** like `ca-pub-1234567890123456`.
- Send it to me (or paste it yourself) into `assets/calc.js` → `CONFIG.adsensePublisherId`.
  The ad slots are already in every page and stay invisible until that ID is set — so the site looks clean while you wait for approval.

### 5. (Optional) Add affiliate links — anytime
Finance has strong affiliate programs (refinance, personal-loan marketplaces, robo-advisors, brokerages).
Add a "Recommended" link near the relevant calculator. Tell me which programs you join and I'll place them tastefully.

---

## What I can do the moment you give me the inputs
- **Domain:** I rebrand every file from `moneymath.example` to your domain.
- **AdSense publisher ID:** I wire it into the config + can add specific ad-unit slot IDs.
- **GA4 measurement ID:** I turn on analytics (`CONFIG.ga4Id`).
- **More calculators:** each new one = more keywords = more traffic. Easy to add (tax, currency, ROI, salary, tip, BMI-style tools all work the same way).

## Honest expectations (so we both watch the right thing)
- **Weeks 0–4:** Google is still indexing. Traffic ≈ near zero. Normal. Don't panic.
- **Weeks 4–12:** pages start ranking for long-tail terms; traffic + earnings trickle up.
- **The check-in:** at ~week 4, look at Search Console "Impressions." If they're climbing, it's working — keep adding calculators. If totally flat, the niche/domain needs a rethink and we pivot. No sunk-cost.
- **The math:** at finance ad rates (~$15–40 RPM), **~150 visitors/day ≈ $5/day**. Six strong calculators ranking can realistically clear that; getting there is the 2–3 month part.

## Local preview right now
The site is static. To look at it on your machine:
```
cd ~/money-calculators && python3 -m http.server 8765
```
then open **http://localhost:8765** in your browser. (I'll also screenshot it for you.)

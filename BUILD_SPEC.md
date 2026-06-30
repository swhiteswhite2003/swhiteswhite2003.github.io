# MoneyMath — Build Spec (the contract)

A static site of free finance calculators. Pure HTML + CSS + vanilla JS. No framework, no build
step, no backend. Goal: rank in Google, monetize with AdSense/affiliate, earn ~$5/day passively.

## Tech rules (non-negotiable — keeps every page consistent)
- Every page is a standalone `<slug>/index.html` (clean URLs like `/loan-calculator/`).
- Use ROOT-RELATIVE paths only: `/assets/styles.css`, `/assets/calc.js`, `/loan-calculator/`.
- Shared design system: `/assets/styles.css` (already built — DO NOT add page CSS; reuse the classes).
- Shared math engine + helpers: `/assets/calc.js`, exposed as global `MM`. Available functions:
  - `MM.amortize(principal, annualRatePct, years, {extraMonthly})` → `{monthlyPayment, paymentWithExtra, totalPaid, totalInterest, months, payoffYears, schedule:[{year,principal,interest,balance}]}`
  - `MM.compound(principal, contribution, annualRatePct, years, {periodsPerYear, contributeAtStart})` → `{futureValue, totalContributions, totalInterest, principal, yearly:[{year,balance,interestThisYear}]}`
  - `MM.debtPayoff(debts[{name,balance,apr,minPayment}], extra, "snowball"|"avalanche")` → `{months, years, totalInterest, totalPaid, order[], feasible}`
  - `MM.fmtCurrency(n,{cents:false})`, `MM.fmtNum(n,frac)`, `MM.fmtPct(n,frac)`, `MM.parseNum(v)`, `MM.val(id)`, `MM.debounce(fn,ms)`
  - **All math MUST come from these functions. Never re-implement a formula inline.**
- **The mortgage page `/mortgage-calculator/index.html` is the GOLD TEMPLATE. Copy its exact
  structure, class names, header/nav, footer, cookie bar, ad slots, JSON-LD pattern, and inline
  `<script>` compute pattern.** Only change the inputs, the result fields, the copy, and the slug.

## Required structure on every calculator page (in this order)
1. `<head>`: charset, viewport, unique `<title>` (`<Name> — <benefit> | MoneyMath`, ≤60 chars),
   unique `<meta name="description">` (≤155 chars), `<link rel="canonical">`, og: tags,
   stylesheet link, and a JSON-LD `@graph` with a `WebApplication` node + a `FAQPage` node
   (3+ Q&As matching the on-page FAQ).
2. `<header class="site-header">` — identical brand + nav across all pages.
3. `.page-head` with `<h1>` (one per page) + `.lede`.
4. `.ad-slot` (top), the `.calc` card (inputs in `.grid`, a `.result` block with `aria-live`,
   and a `<details>` schedule table where relevant), `.ad-slot` (mid).
5. `.content`: "How it works" (include the formula), a value section, an FAQ as `<details>`
   blocks (must match the JSON-LD FAQ), and the `.note` "not financial advice" disclaimer.
6. `<footer class="site-footer">` — identical across all pages (Home/About/Contact/Privacy/Disclaimer).
7. `#cookie-bar` + `<script src="/assets/calc.js">` + inline compute `<script>`.
8. Live recompute: attach `input` listeners (debounced) to every field + call `compute()` once on load.
   Set `#yr` to the current year.

## SEO musts
- One `<h1>`, descriptive `<h2>/<h3>`. Target the page's head keyword in title, H1, and first paragraph.
- FAQ content should answer real long-tail queries (good for featured snippets).
- Keep copy genuinely useful and specific to that calculator — no filler, no duplicate boilerplate text between pages.

## Quality bar
- Math must be correct (it's audited in calc.js — just call it). Handle 0%, empty, and huge inputs gracefully.
- Mobile-first; the shared CSS already handles responsiveness — just use the classes.
- No external requests except AdSense/GA (already wired in calc.js, dormant until CONFIG is filled).

## Pages to build (5 calculators — mortgage already done)
| Slug | Calculator | Core fn | Notes |
|---|---|---|---|
| `/loan-calculator/` | Personal Loan Calculator | `amortize` | amount, APR, term(yrs), optional extra; show payment/interest/total + schedule |
| `/auto-loan-calculator/` | Auto Loan Calculator | `amortize` | vehicle price, down payment, trade-in, APR, term(months/yrs); loan = price−down−trade |
| `/compound-interest-calculator/` | Compound Interest Calculator | `compound` | initial, monthly contribution, rate, years, compounding freq select; FV + contributions + interest + yearly table |
| `/retirement-calculator/` | Retirement Savings Calculator | `compound` | current savings, monthly contribution, expected return, current age, retirement age (years=retire−current); show nest egg + breakdown |
| `/debt-payoff-calculator/` | Debt Payoff Calculator (Snowball/Avalanche) | `debtPayoff` | 3–4 debt rows (balance, APR, min payment) + extra/month + method toggle; show months/years to debt-free, total interest, payoff order |

## Supporting pages (build these too)
- `/index.html` — homepage: hero, a `.cards` grid linking all 6 calculators (icon, name, one-liner), short intro copy, ad slot. Has its own title/description/canonical + `WebSite` JSON-LD.
- `/about/index.html`, `/contact/index.html` — short, real, trust-building (AdSense needs these).
- `/privacy/index.html` — privacy policy covering cookies, AdSense/Google, analytics, "math runs in your browser, we don't store your inputs." (Required for AdSense approval.)
- `/disclaimer/index.html` — "information only, not financial advice."
- `/sitemap.xml` — list all pages. `/robots.txt` — allow all + point to sitemap. `/404.html`.

## Brand
Name "MoneyMath", green accent (already in CSS). Brand is `MM.CONFIG.brand`; domain placeholder
`moneymath.example`. All rebrandable later in one place — don't hardcode a different name.

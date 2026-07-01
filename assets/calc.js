/* MoneyMath — shared calculator engine + helpers.
   All math here is unit-tested in assets/calc.test.js (run: node assets/calc.test.js).
   Keep formulas in ONE place so every calculator page shares the same audited core. */

(function (global) {
  "use strict";

  /* ----------------------------------------------------------------
     CONFIG — the only things you edit after building.
     ---------------------------------------------------------------- */
  const CONFIG = {
    brand: "MoneyMath",
    domain: "swhiteswhite2003.github.io",            // <- replace with your real domain
    adsensePublisherId: "",                  // <- "ca-pub-XXXXXXXXXXXXXXXX" after AdSense approval
    ga4Id: "",                               // <- "G-XXXXXXXXXX" for Google Analytics (optional)
    analyticsNamespace: "mm-eli23z7j7n",     // free Abacus hit counter (no account); view at /stats/
    defaultCurrency: "USD",
    defaultLocale: "en-US"
  };
  global.MM_CONFIG = CONFIG;

  /* ----------------------------------------------------------------
     Formatting + parsing
     ---------------------------------------------------------------- */
  function parseNum(v) {
    if (v === null || v === undefined) return NaN;
    const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
    return isFinite(n) ? n : NaN;
  }

  function fmtCurrency(n, opts) {
    opts = opts || {};
    const currency = opts.currency || CONFIG.defaultCurrency;
    const locale = opts.locale || CONFIG.defaultLocale;
    const maxFrac = opts.cents === false ? 0 : 2;
    if (!isFinite(n)) n = 0;
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency", currency: currency,
        minimumFractionDigits: maxFrac, maximumFractionDigits: maxFrac
      }).format(n);
    } catch (e) {
      return "$" + n.toFixed(maxFrac);
    }
  }

  function fmtNum(n, frac) {
    if (!isFinite(n)) n = 0;
    return new Intl.NumberFormat(CONFIG.defaultLocale, {
      minimumFractionDigits: frac || 0, maximumFractionDigits: frac == null ? 2 : frac
    }).format(n);
  }

  function fmtPct(n, frac) {
    if (!isFinite(n)) n = 0;
    return fmtNum(n, frac == null ? 2 : frac) + "%";
  }

  /* ----------------------------------------------------------------
     CORE MATH
     ---------------------------------------------------------------- */

  /* Amortizing loan (mortgage, auto, personal).
     Standard payment formula:  M = P * r(1+r)^n / ((1+r)^n - 1)
     r = monthly rate, n = number of monthly payments.
     Handles r = 0 (interest-free) -> M = P / n.
     Returns payment, totals, and a yearly-summarized schedule. */
  function amortize(principal, annualRatePct, years, opts) {
    opts = opts || {};
    principal = Math.max(0, principal || 0);
    const n = Math.round((years || 0) * 12);
    const r = (annualRatePct || 0) / 100 / 12;
    const extra = Math.max(0, opts.extraMonthly || 0);

    if (n <= 0 || principal <= 0) {
      return { monthlyPayment: 0, totalPaid: 0, totalInterest: 0, months: 0, schedule: [] };
    }

    let basePayment;
    if (r === 0) basePayment = principal / n;
    else basePayment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    const payment = basePayment + extra;
    let balance = principal;
    let totalInterest = 0, totalPaid = 0, month = 0;
    const yearly = [];
    let yrInterest = 0, yrPrincipal = 0;

    while (balance > 0.005 && month < n + 1200) { // guard: never infinite
      month++;
      const interest = balance * r;
      let principalPaid = payment - interest;
      if (principalPaid > balance) principalPaid = balance;
      balance -= principalPaid;
      totalInterest += interest;
      totalPaid += interest + principalPaid;
      yrInterest += interest;
      yrPrincipal += principalPaid;
      if (month % 12 === 0 || balance <= 0.005) {
        yearly.push({
          year: Math.ceil(month / 12),
          interest: yrInterest,
          principal: yrPrincipal,
          balance: Math.max(0, balance)
        });
        yrInterest = 0; yrPrincipal = 0;
      }
    }

    return {
      monthlyPayment: basePayment,        // scheduled payment (excl. extra)
      paymentWithExtra: payment,
      totalPaid: totalInterest + principal,
      totalInterest: totalInterest,
      months: month,
      payoffYears: month / 12,
      schedule: yearly
    };
  }

  /* Compound growth with regular contributions.
     FV = P(1+i)^N + PMT * ((1+i)^N - 1) / i      (contributions at period end)
     i = periodic rate, N = number of periods. Handles i = 0.
     contributionsPerYear and compoundsPerYear default to 12 (monthly). */
  function compound(principal, contribution, annualRatePct, years, opts) {
    opts = opts || {};
    const m = opts.periodsPerYear || 12;          // compounding + contribution periods
    principal = principal || 0;
    contribution = contribution || 0;
    const N = Math.round((years || 0) * m);
    const i = (annualRatePct || 0) / 100 / m;
    const dueStart = !!opts.contributeAtStart;     // annuity-due if true

    let fv;
    if (N <= 0) fv = principal;
    else if (i === 0) fv = principal + contribution * N;
    else {
      const growth = Math.pow(1 + i, N);
      let annuity = contribution * (growth - 1) / i;
      if (dueStart) annuity *= (1 + i);
      fv = principal * growth + annuity;
    }

    const totalContributions = principal + contribution * N;
    const totalInterest = fv - totalContributions;

    // yearly breakdown
    const yearly = [];
    let bal = principal;
    const yrs = Math.ceil(N / m);
    for (let y = 1; y <= yrs; y++) {
      let yrInterest = 0;
      const periodsThisYear = Math.min(m, N - (y - 1) * m);
      for (let p = 0; p < periodsThisYear; p++) {
        if (dueStart) bal += contribution;
        const interest = bal * i;
        yrInterest += interest;
        bal += interest;
        if (!dueStart) bal += contribution;
      }
      yearly.push({ year: y, balance: bal, interestThisYear: yrInterest });
    }

    return {
      futureValue: fv,
      totalContributions: totalContributions,
      totalInterest: totalInterest,
      principal: principal,
      yearly: yearly
    };
  }

  /* Debt payoff — snowball (smallest balance first) or avalanche (highest APR first).
     debts: [{name, balance, apr, minPayment}], extra = extra $/month applied to focus debt.
     Returns months to debt-free, total interest, and per-debt payoff order. */
  function debtPayoff(debts, extra, method) {
    extra = Math.max(0, extra || 0);
    method = method === "avalanche" ? "avalanche" : "snowball";
    // deep copy
    let list = debts.map(function (d, idx) {
      return { name: d.name || ("Debt " + (idx + 1)), balance: Math.max(0, d.balance || 0),
               apr: Math.max(0, d.apr || 0), minPayment: Math.max(0, d.minPayment || 0), order: 0 };
    }).filter(function (d) { return d.balance > 0; });

    if (!list.length) return { months: 0, totalInterest: 0, totalPaid: 0, order: [], feasible: true };

    let month = 0, totalInterest = 0, totalPaid = 0;
    let paidOrder = [];
    const GUARD = 1200;

    while (list.some(function (d) { return d.balance > 0.005; }) && month < GUARD) {
      month++;
      // accrue interest
      list.forEach(function (d) {
        if (d.balance > 0) {
          const interest = d.balance * (d.apr / 100 / 12);
          d.balance += interest;
          totalInterest += interest;
        }
      });
      // budget = all minimums + extra
      let budget = list.reduce(function (s, d) { return s + (d.balance > 0 ? d.minPayment : 0); }, 0) + extra;

      // feasibility: minimums must at least cover interest of focus, else never pays off
      // pick focus debt
      const active = list.filter(function (d) { return d.balance > 0.005; });
      active.sort(function (a, b) {
        return method === "avalanche" ? (b.apr - a.apr) : (a.balance - b.balance);
      });

      // pay minimums first (capped at balance)
      active.forEach(function (d) {
        const pay = Math.min(d.minPayment, d.balance);
        d.balance -= pay; budget -= pay; totalPaid += pay;
      });
      // throw remaining budget at focus debt, cascading
      for (let k = 0; k < active.length && budget > 0.005; k++) {
        const d = active[k];
        if (d.balance <= 0.005) continue;
        const pay = Math.min(budget, d.balance);
        d.balance -= pay; budget -= pay; totalPaid += pay;
      }
      // record newly-cleared debts
      active.forEach(function (d) {
        if (d.balance <= 0.005 && paidOrder.indexOf(d.name) === -1) {
          paidOrder.push(d.name);
        }
      });
    }

    const feasible = month < GUARD;
    return {
      months: month,
      years: month / 12,
      totalInterest: totalInterest,
      totalPaid: totalPaid,
      order: paidOrder,
      feasible: feasible
    };
  }

  /* Solve for the regular contribution needed to reach a target future value.
     PMT = (FV − P(1+i)^N) · i / ((1+i)^N − 1).  Handles i = 0 and "already there". */
  function solveContribution(target, principal, annualRatePct, years, opts) {
    opts = opts || {};
    const m = opts.periodsPerYear || 12;
    const N = Math.round((years || 0) * m);
    const i = (annualRatePct || 0) / 100 / m;
    target = target || 0; principal = principal || 0;
    if (N <= 0) return { contribution: Infinity, periodsPerYear: m, periods: 0 };
    let pmt;
    if (i === 0) pmt = (target - principal) / N;
    else {
      const growth = Math.pow(1 + i, N);
      pmt = (target - principal * growth) * i / (growth - 1);
    }
    return { contribution: Math.max(0, pmt), periodsPerYear: m, periods: N };
  }

  /* Pay off a fixed balance with a FIXED monthly payment (e.g. credit card).
     Simulates to get exact months + interest. Infeasible if payment <= monthly interest. */
  function payoffWithPayment(balance, annualRatePct, monthlyPayment) {
    balance = Math.max(0, balance || 0);
    const r = (annualRatePct || 0) / 100 / 12;
    monthlyPayment = Math.max(0, monthlyPayment || 0);
    if (balance <= 0) return { months: 0, totalInterest: 0, totalPaid: 0, feasible: true };
    if (r > 0 && monthlyPayment <= balance * r + 1e-9) {
      return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity, feasible: false };
    }
    if (monthlyPayment <= 0) return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity, feasible: false };
    let bal = balance, months = 0, totalInterest = 0, totalPaid = 0;
    while (bal > 0.005 && months < 1200) {
      months++;
      const interest = bal * r;
      let principalPaid = monthlyPayment - interest;
      if (principalPaid > bal) principalPaid = bal;
      bal -= principalPaid;
      totalInterest += interest;
      totalPaid += interest + principalPaid;
    }
    return { months: months, years: months / 12, totalInterest: totalInterest, totalPaid: totalPaid, feasible: true };
  }

  /* Return on investment. Total return and annualized (CAGR) return. */
  function roi(initial, finalValue, years) {
    initial = initial || 0; finalValue = finalValue || 0;
    const gain = finalValue - initial;
    const totalReturnPct = initial > 0 ? (gain / initial) * 100 : 0;
    let annualizedPct = totalReturnPct;
    if (initial > 0 && years > 0 && finalValue > 0) {
      annualizedPct = (Math.pow(finalValue / initial, 1 / years) - 1) * 100;
    }
    return { gain: gain, totalReturnPct: totalReturnPct, annualizedPct: annualizedPct };
  }

  /* Simple (non-compounding) interest:  I = P · r · t. */
  function simpleInterest(principal, annualRatePct, years) {
    principal = principal || 0;
    const interest = principal * (annualRatePct || 0) / 100 * (years || 0);
    return { interest: interest, total: principal + interest };
  }

  /* ----------------------------------------------------------------
     UI helpers
     ---------------------------------------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function val(id) { return parseNum((document.getElementById(id) || {}).value); }

  function debounce(fn, ms) {
    let t; return function () { clearTimeout(t); const a = arguments, c = this; t = setTimeout(function () { fn.apply(c, a); }, ms || 120); };
  }

  /* ----------------------------------------------------------------
     Ads + analytics + cookie banner (no-op until CONFIG is filled)
     ---------------------------------------------------------------- */
  function initMonetization() {
    if (CONFIG.adsensePublisherId) {
      document.body.classList.add("live");
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + CONFIG.adsensePublisherId;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
      document.querySelectorAll(".ad-slot[data-slot]").forEach(function (el) {
        const ins = document.createElement("ins");
        ins.className = "adsbygoogle";
        ins.style.display = "block";
        ins.setAttribute("data-ad-client", CONFIG.adsensePublisherId);
        ins.setAttribute("data-ad-slot", el.getAttribute("data-slot"));
        ins.setAttribute("data-ad-format", "auto");
        ins.setAttribute("data-full-width-responsive", "true");
        el.innerHTML = ""; el.appendChild(ins);
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
      });
    }
    if (CONFIG.ga4Id) {
      const g = document.createElement("script");
      g.async = true; g.src = "https://www.googletagmanager.com/gtag/js?id=" + CONFIG.ga4Id;
      document.head.appendChild(g);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", CONFIG.ga4Id);
    }
  }

  /* Anonymous, cookieless pageview counter via Abacus (free, no account, no PII).
     Just increments a number per page + a site-wide total. Skips localhost/file so
     dev + tests never inflate real numbers. Read the totals at /stats/. */
  function initCounter() {
    if (!CONFIG.analyticsNamespace) return;
    var h = location.hostname;
    if (!h || h === "localhost" || h === "127.0.0.1" || location.protocol === "file:") return;
    var ua = (navigator && navigator.userAgent) || "";
    if (/bot|crawl|spider|slurp|jsdom|headless|phantom|lighthouse|preview|monitor/i.test(ua)) return; // count humans, not bots/tests
    var ns = encodeURIComponent(CONFIG.analyticsNamespace);
    var page = location.pathname.replace(/index\.html$/, "").replace(/^\/+|\/+$/g, "");
    page = (page || "home").replace(/[^a-z0-9\-]/gi, "-").toLowerCase().slice(0, 40);
    if (page === "stats") return; // don't count the stats dashboard itself
    var base = "https://abacus.jasoncameron.dev/hit/" + ns + "/";
    function ping(key) {
      try { fetch(base + encodeURIComponent(key), { method: "GET", mode: "no-cors", keepalive: true }); } catch (e) {}
    }
    ping("total");
    ping(page);
  }

  function initCookieBar() {
    try {
      if (localStorage.getItem("mm_cookie_ok")) return;
    } catch (e) {}
    const bar = document.getElementById("cookie-bar");
    if (!bar) return;
    bar.classList.add("show");
    const btn = bar.querySelector("button");
    if (btn) btn.addEventListener("click", function () {
      try { localStorage.setItem("mm_cookie_ok", "1"); } catch (e) {}
      bar.classList.remove("show");
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
      initMonetization();
      initCounter();
      initCookieBar();
    });
  }

  /* ----------------------------------------------------------------
     Export
     ---------------------------------------------------------------- */
  const MM = {
    CONFIG: CONFIG,
    parseNum: parseNum, fmtCurrency: fmtCurrency, fmtNum: fmtNum, fmtPct: fmtPct,
    amortize: amortize, compound: compound, debtPayoff: debtPayoff,
    solveContribution: solveContribution, payoffWithPayment: payoffWithPayment,
    roi: roi, simpleInterest: simpleInterest,
    $: $, val: val, debounce: debounce
  };
  global.MM = MM;
  if (typeof module !== "undefined" && module.exports) module.exports = MM;

})(typeof window !== "undefined" ? window : global);

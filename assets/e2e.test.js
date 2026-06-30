/* End-to-end correctness test: loads each REAL page in jsdom, sets the actual
   inputs, fires the input events, reads the on-screen result, and compares to an
   independently-computed expected value. This tests each page's WIRING (right field
   read, right argument order, right units, derived values like trade-in / employer
   match), which the unit tests in calc.test.js do not cover.
   Requires the local server running: python3 -m http.server 8765
   Run: node assets/e2e.test.js */
const MM = require("./calc.js");
const { JSDOM } = require("jsdom");
const BASE = "http://localhost:8765";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (s) => parseFloat(String(s).replace(/[^0-9.\-]/g, ""));
function months(s) {
  if (/never/i.test(s)) return Infinity;
  const y = +((s.match(/(\d+)\s*year/) || [])[1] || 0);
  const mo = +((s.match(/(\d+)\s*month/) || [])[1] || 0);
  return y * 12 + mo;
}

// independently-derived expected values (intended semantics)
const mortgagePI = MM.amortize(320000, 6.5, 30).monthlyPayment;
const e401kMonthly = 80000 * 0.10 / 12 + 80000 * Math.min(10, 6) / 100 * (50 / 100) / 12;

const CASES = [
  { slug: "mortgage-calculator", inputs: { price: 400000, down: 80000, rate: 6.5, term: 30, tax: 3600, ins: 1200, extra: 0 },
    read: "monthly", expected: mortgagePI + (3600 + 1200) / 12, tol: 1, kind: "num",
    desc: "400k home, 80k down, 6.5%/30y + 3600 tax + 1200 ins -> full monthly (P&I+T&I)" },
  { slug: "loan-calculator", inputs: { amount: 20000, rate: 9, term: 5, extra: 0 },
    read: "monthly", expected: MM.amortize(20000, 9, 5).monthlyPayment, tol: 0.5, kind: "num",
    desc: "20k @9% /5y monthly payment" },
  { slug: "auto-loan-calculator", inputs: { price: 35000, down: 5000, tradein: 3000, rate: 6, term: 60 },
    read: "monthly", expected: MM.amortize(27000, 6, 5).monthlyPayment, tol: 0.5, kind: "num",
    desc: "35k - 5k down - 3k trade-in = 27k @6% /60mo (tests trade-in subtraction)" },
  { slug: "compound-interest-calculator", inputs: { initial: 10000, monthly: 500, rate: 7, years: 30, freq: 12 },
    read: "fv", expected: MM.compound(10000, 500, 7, 30, { periodsPerYear: 12 }).futureValue, tol: 5, kind: "num",
    desc: "10k + 500/mo @7% /30y monthly compounding -> future value" },
  { slug: "retirement-calculator", inputs: { currentAge: 30, retireAge: 65, savings: 50000, monthly: 800, rate: 7 },
    read: "nestegg", expected: MM.compound(50000, 800, 7, 35, { periodsPerYear: 12 }).futureValue, tol: 50, kind: "num",
    desc: "age 30->65 (35y), 50k + 800/mo @7% -> nest egg (tests years = retire-current)" },
  { slug: "debt-payoff-calculator", inputs: { name1: "Card", bal1: 5000, apr1: 22, min1: 100, name2: "Loan", bal2: 8000, apr2: 9, min2: 150, bal3: "", bal4: "", extra: 300, method: "avalanche" },
    read: "debtfree", expected: MM.debtPayoff([{ name: "Card", balance: 5000, apr: 22, minPayment: 100 }, { name: "Loan", balance: 8000, apr: 9, minPayment: 150 }], 300, "avalanche").months, tol: 1, kind: "months",
    desc: "2 debts, +300/mo, avalanche -> months to debt-free" },
  { slug: "savings-goal-calculator", inputs: { target: 100000, saved: 10000, years: 20, rate: 6 },
    read: "monthly", expected: MM.solveContribution(100000, 10000, 6, 20, { periodsPerYear: 12 }).contribution, tol: 0.5, kind: "num",
    desc: "100k goal in 20y, 10k saved, 6% -> required monthly" },
  { slug: "401k-calculator", inputs: { age: 30, retire: 65, balance: 20000, salary: 80000, contrib: 10, matchrate: 50, matchlimit: 6, ret: 7 },
    read: "projected", expected: MM.compound(20000, e401kMonthly, 7, 35, { periodsPerYear: 12 }).futureValue, tol: 100, kind: "num",
    desc: "80k salary, 10% contrib, 50% match up to 6%, 35y @7% -> projected (tests match formula)" },
  { slug: "credit-card-payoff-calculator", inputs: { balance: 6000, apr: 19.99, pay: 200 },
    read: "payoffTime", expected: MM.payoffWithPayment(6000, 19.99, 200).months, tol: 1, kind: "months",
    desc: "6000 @19.99% paying 200/mo -> months to payoff" },
  { slug: "roi-calculator", inputs: { initial: 10000, final: 15000, years: 5 },
    read: "totalReturn", expected: MM.roi(10000, 15000, 5).totalReturnPct, tol: 0.2, kind: "num",
    desc: "10k -> 15k -> 50% total return" },
  { slug: "simple-interest-calculator", inputs: { principal: 10000, rate: 5, years: 3 },
    read: "interest", expected: MM.simpleInterest(10000, 5, 3).interest, tol: 0.5, kind: "num",
    desc: "10k @5% for 3y -> 1500 simple interest" },
  { slug: "cd-calculator", inputs: { deposit: 10000, rate: 4.5, term: 24, freq: 12 },
    read: "maturity", expected: MM.compound(10000, 0, 4.5, 2, { periodsPerYear: 12 }).futureValue, tol: 1, kind: "num",
    desc: "10k @4.5% APY, 24-month term, monthly compounding -> maturity (tests term=months)" }
];

async function runCase(c) {
  const dom = await JSDOM.fromURL(`${BASE}/${c.slug}/`, {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true
  });
  const { document } = dom.window;
  await sleep(150); // let scripts + initial compute run
  for (const [id, v] of Object.entries(c.inputs)) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`input #${id} not found on ${c.slug}`);
    el.value = String(v);
    el.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    el.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  }
  await sleep(300); // past the debounce
  const el = document.getElementById(c.read);
  if (!el) throw new Error(`result #${c.read} not found on ${c.slug}`);
  const text = el.textContent.trim();
  dom.window.close();
  const got = c.kind === "months" ? months(text) : num(text);
  return { text, got };
}

(async () => {
  let pass = 0, fail = 0;
  for (const c of CASES) {
    try {
      const { text, got } = await runCase(c);
      const good = Math.abs(got - c.expected) <= c.tol;
      if (good) { pass++; console.log(`  ok  ${c.slug.padEnd(34)} shows "${text}"  (expected ~${c.kind === "months" ? c.expected : c.expected.toFixed(2)})`); }
      else { fail++; console.log(`FAIL  ${c.slug.padEnd(34)} shows "${text}" -> ${got}, expected ${c.expected} (±${c.tol})`); console.log(`        ${c.desc}`); }
    } catch (e) {
      fail++; console.log(`ERROR ${c.slug}: ${e.message}`);
    }
  }
  console.log(`\nE2E: ${pass} passed, ${fail} failed (of ${CASES.length} pages).`);
  process.exit(fail ? 1 : 0);
})();

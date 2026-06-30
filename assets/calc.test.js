/* Math verification for calc.js. Run: node assets/calc.test.js
   These check against hand/known values. Any failure exits non-zero. */
const MM = require("./calc.js");

let pass = 0, fail = 0;
function ok(name, got, want, tol) {
  tol = tol == null ? 0.01 : tol;
  const good = Math.abs(got - want) <= tol;
  if (good) { pass++; console.log("  ok  " + name + "  (" + got + ")"); }
  else { fail++; console.log("FAIL  " + name + "  got " + got + " want " + want); }
}

console.log("amortize():");
// $200,000 @ 6% over 30y -> payment ~ $1199.10 (well-known value)
let m = MM.amortize(200000, 6, 30);
ok("mortgage 200k/6%/30y monthly payment", m.monthlyPayment, 1199.10, 0.5);
ok("mortgage total interest", m.totalInterest, 231676.38, 200); // 1199.10*360 - 200000
// 0% loan: 12000 over 2y -> 500/mo, 0 interest
let z = MM.amortize(12000, 0, 2);
ok("0% loan payment", z.monthlyPayment, 500, 0.01);
ok("0% loan interest", z.totalInterest, 0, 0.01);
// auto: 30000 @ 5% over 5y -> ~566.14/mo
let a = MM.amortize(30000, 5, 5);
ok("auto 30k/5%/5y payment", a.monthlyPayment, 566.14, 0.5);
// extra payment shortens term: 200k/6%/30y + $200/mo extra -> < 360 months
let ex = MM.amortize(200000, 6, 30, { extraMonthly: 200 });
ok("extra payment cuts months below 360", ex.months < 360 ? 1 : 0, 1, 0);

console.log("compound():");
// 10,000 once, no contributions, 7% for 10y, annual compounding -> 10000*1.07^10 = 19671.51
let c1 = MM.compound(10000, 0, 7, 10, { periodsPerYear: 1 });
ok("compound lump 10k/7%/10y annual", c1.futureValue, 19671.51, 0.5);
// monthly $500 for 30y at 7% (no principal), monthly compounding
// FV = 500 * ((1+0.07/12)^360 - 1)/(0.07/12) = 609,985.5 (approx)
let c2 = MM.compound(0, 500, 7, 30, { periodsPerYear: 12 });
ok("compound 500/mo 7%/30y", c2.futureValue, 609985.5, 50);
// 0% rate: 1000 + 100/mo for 1y monthly -> 1000 + 1200 = 2200
let c3 = MM.compound(1000, 100, 0, 1, { periodsPerYear: 12 });
ok("compound 0% rate", c3.futureValue, 2200, 0.01);
ok("compound 0% interest portion", c3.totalInterest, 0, 0.01);

console.log("debtPayoff():");
// single debt 1000 @ 0% apr, min 100, no extra -> 10 months, 0 interest
let d1 = MM.debtPayoff([{ name: "A", balance: 1000, apr: 0, minPayment: 100 }], 0, "snowball");
ok("debt single 0% 10 months", d1.months, 10, 0);
ok("debt single 0% no interest", d1.totalInterest, 0, 0.01);
// two debts, extra accelerates; just check it pays off and order populated
let d2 = MM.debtPayoff([
  { name: "Card", balance: 2000, apr: 20, minPayment: 50 },
  { name: "Loan", balance: 5000, apr: 8, minPayment: 100 }
], 200, "avalanche");
ok("debt multi pays off (feasible)", d2.feasible ? 1 : 0, 1, 0);
ok("debt multi order has 2", d2.order.length, 2, 0);

console.log("solveContribution():");
// To hit 609,985.5 in 30y @7% from 0 -> ~500/mo (inverse of the compound test above)
let sc = MM.solveContribution(609985.5, 0, 7, 30, { periodsPerYear: 12 });
ok("solve 609,985 over 30y @7% -> ~500/mo", sc.contribution, 500, 0.5);
// round-trip: feed solved contribution back into compound -> should reach target
let rt = MM.compound(0, sc.contribution, 7, 30, { periodsPerYear: 12 });
ok("solveContribution round-trips through compound", rt.futureValue, 609985.5, 5);
// 0% rate: need 12000 in 1y from 0 -> 1000/mo
let sc0 = MM.solveContribution(12000, 0, 0, 1, { periodsPerYear: 12 });
ok("solve 0% 12k in 1y -> 1000/mo", sc0.contribution, 1000, 0.01);

console.log("payoffWithPayment():");
// 5000 @ 18% APR, paying 200/mo -> ~32 months (well-known credit-card example)
let pp = MM.payoffWithPayment(5000, 18, 200);
ok("cc 5000 @18% / 200 mo -> ~32 months", pp.months, 32, 1);
ok("cc payoff is feasible", pp.feasible ? 1 : 0, 1, 0);
// payment below monthly interest -> infeasible (5000*18%/12 = 75; pay 50)
let ppx = MM.payoffWithPayment(5000, 18, 50);
ok("cc underpayment infeasible", ppx.feasible ? 0 : 1, 1, 0);
// 0% balance transfer: 1200 @0% / 100 -> 12 months, 0 interest
let pp0 = MM.payoffWithPayment(1200, 0, 100);
ok("cc 0% 1200/100 -> 12 months", pp0.months, 12, 0);
ok("cc 0% no interest", pp0.totalInterest, 0, 0.01);

console.log("roi() + simpleInterest():");
// 1000 -> 2000 over 0 years -> 100% total return
let r1 = MM.roi(1000, 2000, 0);
ok("roi 1000->2000 total 100%", r1.totalReturnPct, 100, 0.01);
// 1000 -> 1000*1.1^5 over 5y -> 10% annualized
let r2 = MM.roi(1000, 1000 * Math.pow(1.1, 5), 5);
ok("roi annualized 10%", r2.annualizedPct, 10, 0.01);
// simple interest: 1000 @5% for 3y = 150 interest
let si = MM.simpleInterest(1000, 5, 3);
ok("simple interest 1000@5%/3y = 150", si.interest, 150, 0.01);
ok("simple interest total = 1150", si.total, 1150, 0.01);

console.log("\n" + pass + " passed, " + fail + " failed.");
process.exit(fail ? 1 : 0);

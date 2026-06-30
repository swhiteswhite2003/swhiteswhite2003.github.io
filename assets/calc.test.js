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

console.log("\n" + pass + " passed, " + fail + " failed.");
process.exit(fail ? 1 : 0);

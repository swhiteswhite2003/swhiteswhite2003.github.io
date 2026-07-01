#!/usr/bin/env bash
# Quick traffic readout for MoneyMath. Usage: ./stats.sh
# Reads anonymous pageview counts from the free Abacus counter (no account).
NS="mm-eli23z7j7n"
BASE="https://abacus.jasoncameron.dev/get/$NS"
get() { curl -s -m 10 "$BASE/$1" 2>/dev/null | grep -oE '"value":[0-9]+' | grep -oE '[0-9]+' | head -1; }

pages=(home mortgage-calculator loan-calculator auto-loan-calculator \
  compound-interest-calculator retirement-calculator debt-payoff-calculator \
  savings-goal-calculator 401k-calculator credit-card-payoff-calculator \
  roi-calculator simple-interest-calculator cd-calculator)

total=$(get total); total=${total:-0}
echo "════════════════════════════════════════════"
echo " MoneyMath traffic   (https://swhiteswhite2003.github.io/)"
echo "════════════════════════════════════════════"
echo " TOTAL pageviews: $total"
echo "--------------------------------------------"
for p in "${pages[@]}"; do
  v=$(get "$p"); printf "  %-32s %s\n" "$p" "${v:-0}"
done
echo "════════════════════════════════════════════"
[ "$total" = "0" ] && echo " (0 = no visits recorded yet — counter is live, fills in as people arrive)"
echo " Live dashboard: https://swhiteswhite2003.github.io/stats/"

import {warning} from "@/log.js"

export async function main(ns) {
  let pct = ns.args[0]/100
  let c = ns.corporation
  let total = c.getCorporation().numShares
  let sell = total*pct
  await warning(ns, "Sell %s shares out of %s for $%s",
    ns.formatNumber(sell), ns.formatNumber(total),
    ns.formatNumber(sell*c.getCorporation().sharePrice))
  c.sellShares(sell)
}


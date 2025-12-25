import { info } from "@/log.js"
import { singleInstance, parseNumber } from "@/lib/util.js"

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("asleep")
  if (!singleInstance(ns)) { return }

  let c = ns.corporation
  let target = parseNumber(ns.args[0])
  let num = Math.round(c.getCorporation().totalShares * 0.2)
  num -= num % 1e6

  await info(ns, "Waiting to issue %s shares to make $%s",
    ns.formatNumber(num), ns.formatNumber(target))
  let last = Date.now()
  c.issueDividends(0)
  while (num * c.getCorporation().sharePrice < target) {
    await ns.asleep(10000)
    if (Date.now() - last > 60000) {
      await info(ns, "Still waiting to issue %s shares to make $%s",
        ns.formatNumber(num), ns.formatNumber(target))
    }
  }

  await warning(ns, "Buying %s shares, expected profit: %s",
    ns.formatNumber(num), ns.formatNumber(num*c.getCorporation().sharePrice))
  c.issueNewShares()
  await info(ns, "New balance: %s, Available shares: %s",
    ns.formatNumber(c.getCorporation().funds),
    ns.formatNumber(c.getCorporation().issuedShares))
}

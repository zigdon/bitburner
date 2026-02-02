import { toast } from "@/log.js"

const cashBuffer = 1e7
const minSize = 128

/**
 * @param {NS} ns
 */
export async function main(ns) {
  let m = ns.getPlayer().money - cashBuffer
  if (m < 0) {
    return
  }

  // find larger pserv we can afford to buy with our budget
  if (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
    let size = minSize
    while (ns.getPurchasedServerCost(size*2) < m) {
      size *= 2
    }
    let name = ns.purchaseServer("pserv", size)
    if (name != "") {
      await toast(ns, "Bought %s (%s @ $%s)", name, ns.formatRam(size), ns.formatNumber(ns.getPurchasedServerCost(size)))
    }
    return
  }

  // Find server to upgrade
  for (let s of ns.getPurchasedServers().sort((a,b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b))) {
    let size = ns.getServerMaxRam(s)
    let orig = size
    let cost = 0
    while (ns.getPurchasedServerUpgradeCost(s, size*2) < m) {
      size *=2
      cost = ns.getPurchasedServerUpgradeCost(s, size)
    }
    if (size == orig) {
      continue
    }
    if (ns.upgradePurchasedServer(s, size)) {
      await toast(ns, "Upgraded server from %s to %s for $%s",
        ns.formatRam(orig), ns.formatRam(size), ns.formatNumber(cost))
      break
    } else {
      ns.printf("Failed to upgrade %s to %s", s, ns.formatRam(size))
    }
  }
}


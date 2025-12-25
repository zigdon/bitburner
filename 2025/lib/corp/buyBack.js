import {info} from "@/log.js"

export async function main(ns) {
  let c = ns.corporation
  let m = ns.getPlayer().money
  let price = c.getCorporation().sharePrice
  let issued = c.getCorporation().issuedShares
  let canBuy = Math.min(
    Math.floor(m*0.8/price),
    issued
  )
  await info(ns, "Buying back %s shares out of %s for $%s",
    ns.formatNumber(canBuy), ns.formatNumber(issued),
    ns.formatNumber(canBuy*price)
  )
  c.buyBackShares(canBuy)
}

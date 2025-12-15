/** @param {NS} ns */
export async function main(ns) {
  let upgrade = ns.args.join(" ")
  let c = ns.corporation
  ns.printf("Unlocking %s", upgrade)
  c.purchaseUnlock(upgrade)
}

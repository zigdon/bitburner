import {info} from "@/log.js"

/** @param {NS} ns */
export async function main(ns) {
  let [name, city] = ns.args
  let c = ns.corporation
  let ind = c.getDivision(name).type
  let pre = c.getWarehouse(name, city).size
  c.upgradeWarehouse(name, city)
  let post = c.getWarehouse(name, city).size
  await info(ns, "Upgraded warehouse for %s@%s from %d to %d", name, city, pre, post)
  let pid = ns.run("lib/corp/warehouseFactors.js", 1, name, city)
  while (ns.isRunning(pid)) {
    await ns.asleep(10)
  }
  let pid = ns.run("lib/corp/smartSupply.js")
  while (ns.isRunning(pid)) {
    await ns.asleep(10)
  }
}

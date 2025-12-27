import {info} from "@/log.js"

/** @param {NS} ns */
export async function main(ns) {
  let [name, city] = ns.args
  let c = ns.corporation
  let pre = c.getWarehouse(name, city).size
  c.upgradeWarehouse(name, city)
  let post = c.getWarehouse(name, city).size
  await info(ns, "Upgraded warehouse for %s@%s from %d to %d",
    name, city, pre, post)

  // We know healthcare really wants space, just default to 10%
  if (c.getDivision(name).type == "Healthcare") {
    let pid = ns.run("lib/corp/warehouseFactors.js", 1, name, city, "--fill", "0.1")
    while (ns.isRunning(pid)) {
      await ns.asleep(10)
    }
  } else {
    // Otherwise, figure out how full the warehouse gets. Start with however
    // full it was before.
    let buffer = 0.1+Math.min(0.7, c.getWarehouse(name, city).sizeUsed/pre)
    buffer = Math.floor(buffer*10)/10
    while (buffer > 0.1) {
      let hwm = await getHighWaterMark(ns, name, city)
      if (hwm/post > 0.8) {
        buffer -= 0.1
      } else if (hwm/post > 0.6) {
        break
      }
      let pid = ns.run("lib/corp/warehouseFactors.js", 1, name, city, "--fill", buffer)
      while (ns.isRunning(pid)) {
        await ns.asleep(10)
      }
    }
  }

  let pid = ns.run("lib/corp/smartSupply.js")
  while (ns.isRunning(pid)) {
    await ns.asleep(10)
  }
}

async function getHighWaterMark(ns, name, city) {
  let hwm
  let c = ns.corporation
  while (true) {
    let state = await c.nextUpdate()
    if (state == "PRODUCTION") {
      hwm = c.getWarehouse(name, city).sizeUsed
      break
    }
  }

  return hwm
}

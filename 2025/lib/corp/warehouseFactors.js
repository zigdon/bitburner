import {info, warning} from "@/log.js"

const cities = [
  "Sector-12",
  "Aevum",
  "Volhaven",
  "Chongqing",
  "New Tokyo",
  "Ishima",
]
const sizes = {
  ai: 0.1,
  robot: 0.5,
  hardware: 0.06,
  re: 0.005,
}

/** @param {NS} ns */
export async function main(ns) {
  let flags = ns.flags([
    ["fill", 0.5],
  ])
  let name = flags._[0]
  let cs = flags._.slice(1)
  let industry = ns.corporation.getDivision(name).type
  if (cs.length == 0) {
    cs = cities
  }
  for (let city of cs) {
    await buyWarehouseFactors(ns, name, city, industry, flags["fill"])
  }
}

async function buyWarehouseFactors(ns, name, city, industry, fill) {
  await info(ns, "Buying %d%% warehouse factors for %s@%s (%s)",
    fill*100, name, city, industry)
  let c = ns.corporation
  let data = c.getIndustryData(industry)
  data.aiCoreFactor ??= 0
  data.robotFactor ??= 0
  data.hardwareFactor ??= 0
  data.realEstateFactor ??= 0
  ns.printf("Data: %j", data)
  let pkgSize = data.aiCoreFactor * sizes.ai +
                data.robotFactor * sizes.robot +
                data.hardwareFactor * sizes.hardware +
                data.realEstateFactor * sizes.re;
  ns.printf("pkgSize: %j", pkgSize)

  let size = 0
  try {
    size = c.getWarehouse(name, city).size
  } catch (e) {
    let amt = (100*fill)/pkgSize;
    await warning(ns, "No warehouse API, buy, per 100: %j",
      {
        ai: data.aiCoreFactor * amt,
        robot: data.robotFactor * amt,
        hardware: data.hardwareFactor * amt,
        re: data.realEstateFactor * amt,
      })
    ns.exit()
  }
  ns.printf("Size: %j", size)
  let amt = (size*fill)/pkgSize;
  let target = {
    ai: data.aiCoreFactor * amt,
    robot: data.robotFactor * amt,
    hardware: data.hardwareFactor * amt,
    re: data.realEstateFactor * amt,
  }
  let totSize = target.ai * sizes.ai +
    target.robot * sizes.robot +
    target.hardware * sizes.hardware +
    target.re * sizes.re
  ns.printf("target: %j", target)

  await info(ns, "Buying the right mix for %s in %s x %d (%d/%d)",
    industry, city, amt, totSize, size)
  // Disable smart supply while we muck with things
  c.setSmartSupply(name, city, false)
  // Disable all the imports from other divs in the city
  for (let d of c.getCorporation().divisions) {
    if (!c.hasWarehouse(d, city)) { continue }
    for (let mat of ["AI Cores", "Robots", "Hardware", "Real Estate"]) {
      c.cancelExportMaterial(d, city, name, city, mat)
    }
  }

  c.buyMaterial(name, city, "AI Cores", 0)
  c.sellMaterial(name, city, "AI Cores", 0, "MP")
  c.buyMaterial(name, city, "Robots", 0)
  c.sellMaterial(name, city, "Robots", 0, "MP")
  c.buyMaterial(name, city, "Hardware", 0)
  c.sellMaterial(name, city, "Hardware", 0, "MP")
  c.buyMaterial(name, city, "Real Estate", 0)
  c.sellMaterial(name, city, "Real Estate", 0, "MP")
  let stock = {
    ai: c.getMaterial(name, city, "AI Cores").stored,
    robot: c.getMaterial(name, city, "Robots").stored,
    hardware: c.getMaterial(name, city, "Hardware").stored,
    re: c.getMaterial(name, city, "Real Estate").stored,
  }
  let missing = {
    ai: target.ai-stock.ai,
    robot: target.robot-stock.robot,
    hardware: target.hardware-stock.hardware,
    re: target.re-stock.re,
  }
  await info(ns, "AI: %d -> %d (%d)", stock.ai, target.ai, missing.ai)
  await info(ns, "Robots: %d -> %d (%d)", stock.robot, target.robot, missing.robot)
  await info(ns, "Hardware: %d -> %d (%d)", stock.hardware, target.hardware, missing.hardware)
  await info(ns, "Real Estate: %d -> %d (%d)", stock.re, target.re, missing.re)


  let cont = true
  let start = Date.now()
  while (cont) {
    cont = false
    stock = {
      ai: c.getMaterial(name, city, "AI Cores").stored,
      robot: c.getMaterial(name, city, "Robots").stored,
      hardware: c.getMaterial(name, city, "Hardware").stored,
      re: c.getMaterial(name, city, "Real Estate").stored,
    }
    let selling = []
    ns.printf("Current stock at %s:\n got: %j\nwant: %j", city, stock, target)
    if (stock.ai > target.ai) {
      cont = true
      selling.push("AI")
      c.sellMaterial(name, city, "AI Cores", -missing.ai/10, "MP")
    } else {
      c.sellMaterial(name, city, "AI Cores", 0, "MP")
    }
    if (stock.robot > target.robot) {
      cont = true
      selling.push("robots")
      c.sellMaterial(name, city, "Robots", -missing.robot/10, "MP")
    } else {
      c.sellMaterial(name, city, "Robots", 0, "MP")
    }
    if (stock.hardware > target.hardware) {
      cont = true
      selling.push("hardware")
      c.sellMaterial(name, city, "Hardware", -missing.hardware/10, "MP")
    } else {
      c.sellMaterial(name, city, "Hardware", 0, "MP")
    }
    if (stock.re > target.re) {
      cont = true
      selling.push("real estate")
      c.sellMaterial(name, city, "Real Estate", -missing.re/10, "MP")
    } else {
      c.sellMaterial(name, city, "Real Estate", 0, "MP")
    }
    if (cont) {
      let dur = Date.now() - start
      ns.printf("Still waiting for %s (%s)", selling.join(", "), ns.tFormat(dur))
      if (dur > 60000) {
        ns.printf("Timeout")
        break
      }
    } else {
      break
    }
    await ns.asleep(500)
  }

  if (missing.ai > 0) {
    let amt = Math.min(
      missing.ai,
      (size-c.getWarehouse(name, city).sizeUsed) / sizes.ai)
    c.bulkPurchase(name, city, "AI Cores", amt)
  }
  if (missing.robot > 0) {
    let amt = Math.min(
      missing.robot,
      (size-c.getWarehouse(name, city).sizeUsed) / sizes.robot)
    c.bulkPurchase(name, city, "Robots", amt)
  }
  if (missing.hardware > 0) {
    let amt = Math.min(
      missing.hardware,
      (size-c.getWarehouse(name, city).sizeUsed) / sizes.hardware)
    c.bulkPurchase(name, city, "Hardware", amt)
  }
  if (missing.re > 0) {
    let amt = Math.min(
      missing.re,
      (size-c.getWarehouse(name, city).sizeUsed) / sizes.re)
    c.bulkPurchase(name, city, "Real Estate", amt)
  }

  // Reenable smart supply
  c.setSmartSupply(name, city, true)
  let pid = ns.run("/lib/corp/smartSupply.js")
  while (ns.isRunning(pid)) {
    await ns.asleep(500)
  }
}


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
  let name = ns.args[0]
  let cs = ns.args.slice(1)
  let industry = ns.corporation.getDivision(name).type
  if (cs.length == 0) {
    cs = cities
  }
  for (let city of cs) {
    await buyWarehouseFactors(ns, name, city, industry)
  }
}

async function buyWarehouseFactors(ns, name, city, industry) {
  await info(ns, "Buying warehouse factors for %s@%s (%s)", name, city, industry)
  let c = ns.corporation
  let size = c.getWarehouse(name, city).size
  ns.printf("Size: %j", size)
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

  let amt = (size*0.8)/pkgSize;
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
  if (missing.ai > 0) {
    c.bulkPurchase(name, city, "AI Cores", missing.ai)
  }
  await info(ns, "Robots: %d -> %d (%d)", stock.robot, target.robot, missing.robot)
  if (missing.robot > 0) {
    c.bulkPurchase(name, city, "Robots", missing.robot)
  }
  await info(ns, "Hardware: %d -> %d (%d)", stock.hardware, target.hardware, missing.hardware)
  if (missing.hardware > 0) {
    c.bulkPurchase(name, city, "Hardware", missing.hardware)
  }
  await info(ns, "Real Estate: %d -> %d (%d)", stock.re, target.re, missing.re)
  if (missing.re > 0) {
    c.bulkPurchase(name, city, "Real Estate", missing.re)
  }

  let cont = true
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
      c.sellMaterial(name, city, "AI Cores", missing.ai/10, "MP")
    } else {
      c.sellMaterial(name, city, "AI Cores", 0, "MP")
    }
    if (stock.robot > target.robot) {
      cont = true
      selling.push("robots")
      c.sellMaterial(name, city, "Robots", missing.robot/10, "MP")
    } else {
      c.sellMaterial(name, city, "Robots", 0, "MP")
    }
    if (stock.hardware > target.hardware) {
      cont = true
      selling.push("hardware")
      c.sellMaterial(name, city, "Hardware", missing.hardware/10, "MP")
    } else {
      c.sellMaterial(name, city, "Hardware", 0, "MP")
    }
    if (stock.re > target.re) {
      cont = true
      selling.push("real estate")
      c.sellMaterial(name, city, "Real Estate", missing.re/10, "MP")
    } else {
      c.sellMaterial(name, city, "Real Estate", 0, "MP")
    }
    if (cont) {
      ns.printf("Still waiting for %s", selling.join(", "))
    }
    await ns.asleep(500)
  }
}


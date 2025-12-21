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
  let data = c.getIndustryData(industry)
  let pkgSize = data.aiCoreFactor * sizes.ai +
                data.robotFactor * sizes.robot +
                data.hardwareFactor * sizes.hardware +
                data.realEstateFactor * sizes.re;

  let amt = (size*0.8)/pkgSize;
  let target = {
    ai: data.aiCoreFactor * amt,
    robot: data.robotFactor * amt,
    hardware: data.hardwareFactor * amt,
    re: data.realEstateFactor * amt,
  }
  await info(ns, "Buying the right mix for %s in %s x %d", industry, city, amt)
  let cont = true
  while (cont) {
    cont = false
    let stock = {
      ai: c.getMaterial(name, city, "AI Cores").stored,
      robot: c.getMaterial(name, city, "Robots").stored,
      hardware: c.getMaterial(name, city, "Hardware").stored,
      re: c.getMaterial(name, city, "Real Estate").stored,
    }
    let shopping = []
    let selling = []
    ns.printf("Current stock at %s:\n got: %j\nwant: %j", city, stock, target)
    if (stock.ai < target.ai) {
      cont = true
      shopping.push("AI")
      c.buyMaterial(name, city, "AI Cores", (target.ai-stock.ai)/10)
      c.sellMaterial(name, city, "AI Cores", 0, "MP")
    } else if (stock.ai > target.ai*1.2) {
      cont = true
      selling.push("AI")
      c.buyMaterial(name, city, "AI Cores", 0)
      c.sellMaterial(name, city, "AI Cores", (stock.ai-target.ai)/10, "MP")
    } else {
      c.buyMaterial(name, city, "AI Cores", 0)
      c.sellMaterial(name, city, "AI Cores", 0, "MP")
    }
    if (stock.robot < target.robot) {
      cont = true
      shopping.push("robots")
      c.buyMaterial(name, city, "Robots", (target.robot-stock.robot)/10)
      c.sellMaterial(name, city, "Robots", 0, "MP")
    } else if (stock.robot > target.robot*1.2) {
      cont = true
      selling.push("robots")
      c.buyMaterial(name, city, "Robots", 0)
      c.sellMaterial(name, city, "Robots", (stock.robot-target.robot)/10, "MP")
    } else {
      c.buyMaterial(name, city, "Robots", 0)
      c.sellMaterial(name, city, "Robots", 0, "MP")
    }
    if (stock.hardware < target.hardware) {
      cont = true
      shopping.push("hardware")
      c.buyMaterial(name, city, "Hardware", (target.hardware-stock.hardware)/10)
      c.sellMaterial(name, city, "Hardware", 0, "MP")
    } else if (stock.hardware > target.hardware*1.2) {
      cont = true
      selling.push("hardware")
      c.buyMaterial(name, city, "Hardware", 0)
      c.sellMaterial(name, city, "Hardware", (stock.hardware-target.hardware)/10, "MP")
    } else {
      c.buyMaterial(name, city, "Hardware", 0)
      c.sellMaterial(name, city, "Hardware", 0, "MP")
    }
    if (stock.re < target.re) {
      cont = true
      shopping.push("real estate")
      c.buyMaterial(name, city, "Real Estate", (target.re-stock.re)/10)
      c.sellMaterial(name, city, "Real Estate", 0, "MP")
    } else if (stock.re > target.re*1.2) {
      cont = true
      selling.push("real estate")
      c.buyMaterial(name, city, "Real Estate", 0)
      c.sellMaterial(name, city, "Real Estate", (stock.re-target.re)/10, "MP")
    } else {
      c.buyMaterial(name, city, "Real Estate", 0)
      c.sellMaterial(name, city, "Real Estate", 0, "MP")
    }
    if (cont) {
      ns.printf("Still waiting for buying %s, selling %s", shopping.join(", "), selling.join(", "))
    }
    await ns.asleep(500)
  }
}


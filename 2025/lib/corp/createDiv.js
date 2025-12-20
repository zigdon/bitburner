import {info, warning} from "@/log.js"
/** @param {NS} ns */
const cities = [
  "Sector-12",
  "Aevum",
  "Volhaven",
  "Chongqing",
  "New Tokyo",
  "Ishima",
]
const jobs = {
  ops: "Operations",
  eng: "Engineer",
  bus: "Business",
  mgt: "Management",
  rnd: "Research & Development",
  intern: "Intern",
}
export async function main(ns) {
  let name = ns.args[0]
  let ind = ns.args[1]
  let mats = ns.args.slice(2)
  let c = ns.corporation
  if (!c.getCorporation().divisions.includes(name)) {
    await info(ns, "Creating a new %s division: %s", ind, name)
    c.expandIndustry(ind, name)
  }

  for (let city of cities) {
    ns.printf("Expanding %s into %s", name, city)
    if (!c.getDivision(name).cities.includes(city)) {
      if (c.getCorporation().funds < 5000000000) {
        await warning(ns, "Not enough funds to expand %s to %s, skipping", name, city)
        continue
      }
      await info(ns, "Expanding %s to %s", name, city)
      c.expandCity(name, city)
      c.upgradeOfficeSize(name, city, 3)
    }
    if (!await assign(ns, name, city, {ops: 1, eng: 1, bus: 1, mgt: 1, rnd: 1, intern:1})) { 
      await warning(ns, "Failed to assign jobs for %s@%s", name, city)
      return
    }
    if (!c.hasWarehouse(name, city)) {
      await info(ns, "Buying warehouse in %s", city)
      c.purchaseWarehouse(name, city)
    }
    if (c.getWarehouse(name, city).size == 0) {
      await upgradeWarehouse(ns, name, city, 1)
    }
    for (let m of mats) {
      let pid = ns.run("lib/corp/smartSupply.js", 1, name, city, m)
      while (ns.isRunning(pid)) {
        await ns.asleep(10)
      }
      c.sellMaterial(name, city, m, "MAX", "MP")
    }
    await buyWarehouseFactors(ns, name, city, ind)
  }
}

async function assign(ns, name, city, assignments) {
  let c = ns.corporation
  ns.printf("Updating assignments for %s@%s: %j", name, city, assignments)
  let total = 0;
  for (var job in assignments) {
    total += assignments[job]
  }
  let office = c.getOffice(name, city)
  while (office.size < total) {
    ns.printf("Not enough space for %d employees at %s, buying space for %d more",
      total, city, total - office.size)
    c.upgradeOfficeSize(name, city, total-office.size)
    office = c.getOffice(name, city)
    await ns.asleep(1000)
  }
  while (office.numEmployees < total) {
    await ns.asleep(10)
    c.hireEmployee(name, city)
    office = c.getOffice(name, city)
  }
  for (var job in assignments) {
    if (c.setAutoJobAssignment(name, city, jobs[job], assignments[job])) {
      ns.printf("Set %s@%s %s to %d", name, city, jobs[job], assignments[job])
    } else {
      ns.printf("Couldn't set %s@%s %s to %d", name, city, jobs[job], assignments[job])
      return false
    }
  }

  return true
}

async function upgradeWarehouse(ns, name, city, amt) {
  let c = ns.corporation
  if (c.getWarehouse(name, city).level >= amt) { return true }
  await info(ns, "Upgrading warehouse for %s@%s to %d", name, city, amt)
  c.upgradeWarehouse(name, city, amt)
  return true
}

let sizes = {
  ai: 0.1,
  robot: 0.5,
  hardware: 0.06,
  re: 0.005,
}

async function buyWarehouseFactors(ns, name, city, industry) {
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


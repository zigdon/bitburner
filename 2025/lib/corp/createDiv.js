import {info, warning} from "@/log.js"
import { nsRPC } from "@/lib/nsRPC.js"

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
/** @param {NS} ons */
export async function main(ons) {
  ons.ramOverride(2.7)
  /** @type {NS} */
  let ns = new nsRPC(ons)
  ns.disableLog("asleep")
  let name = ns.args[0]
  let ind = ns.args[1]
  let c = ns.corporation

  let id = await c.getIndustryData(ind)
  let sells = id.producedMaterials
  let buys = Object.keys(id.requiredMaterials)
  let corp = await c.getCorporation()
  if (!corp.divisions.includes(name)) {
    await info(ns, "Creating a new %s division: %s", ind, name)
    c.expandIndustry(ind, name)
  }

  let div = await c.getDivision(name)
  for (let city of cities) {
    if (!div.cities.includes(city)) {
      if (corp.funds < 5000000000) {
        await warning(ns, "Not enough funds to expand %s to %s, skipping", name, city)
        continue
      }
      await info(ns, "Expanding %s to %s", name, city)
      c.expandCity(name, city)
      c.upgradeOfficeSize(name, city, 3)
    }
    if (!await assign(ns, name, city, {ops: 1, eng: 1, bus: 1, mgt: 1, rnd: 1, intern:1})) { 
      await warning(ns, "Failed to assign jobs for %s@%s", name, city)
    }
    let hwh = await c.hasWarehouse(name, city)
    if (hwh === null) {
      await warning(ns, "Warehouse API not available, buy warehouse for %s in %s", name, city)
    } else {
      if (!hwh) {
        await info(ns, "Buying warehouse in %s", city)
        await c.purchaseWarehouse(name, city)
      }
      if (!await c.hasWarehouse(name, city)) {
        await info(ns, "Failed to buy warehouse in %s, skipping", city)
      }
      let wh = await c.getWarehouse(name, city)
      if (wh.size == 0) {
        await upgradeWarehouse(ns, name, city, 1)
      }
    }
    for (let m of buys) {
      await c.setSmartSupply(name, city, true)
      await c.setSmartSupplyOption(name, city, m, "leftovers")
    }
    let pid = ns.run("lib/corp/warehouseFactors.js", 1, name, city)
    while (ns.isRunning(pid)) {
      await ns.asleep(10)
    }
    if (sells?.length > 0) {
      for (let m of sells) {
        await c.sellMaterial(name, city, m, "MAX", "MP")
      }
    }
  }

  if (div.products.length < div.maxProducts) {
    let pid = ns.run("lib/corp/products.js", 1, name, "Idea")
    while (ns.isRunning(pid)) {
      await ns.asleep(10)
    }
  }
}

async function assign(ns, name, city, assignments) {
  let c = ns.corporation
  ns.printf("Updating assignments for %s@%s: %j", name, city, assignments)
  let total = 0;
  for (var job in assignments) {
    total += assignments[job]
  }
  let office = await c.getOffice(name, city)
  if (office === null || office === undefined) {
    await warning(ns, "Office API not available, can't handle assignment for %s@%s: %j", name, city, assignments)
    return
  }
  while (office.size < total) {
    ns.printf("Not enough space for %d employees at %s, buying space for %d more",
      total, city, total - office.size)
    await c.upgradeOfficeSize(name, city, total-office.size)
    office = await c.getOffice(name, city)
    await ns.asleep(1000)
  }
  while (office.numEmployees < total) {
    await ns.asleep(10)
    await c.hireEmployee(name, city)
    office = await c.getOffice(name, city)
  }
  for (let job in assignments) {
    if (await c.setAutoJobAssignment(name, city, jobs[job], assignments[job])) {
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
  let wh = await c.getWarehouse(name, city)
  if (wh === null) {
    await warning(ns, "Can't upgrade %s@%s warehouse to %j", name, city, amt)
    return true
  }
  if (wh.level >= amt) { return true }
  await info(ns, "Upgrading warehouse for %s@%s to %d", name, city, amt)
  await c.upgradeWarehouse(name, city, amt)
  return true
}

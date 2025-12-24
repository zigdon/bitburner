import {info, warning} from "@/log.js"
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
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("asleep")
  let name = ns.args[0]
  let ind = ns.args[1]
  let c = ns.corporation

  let id = c.getIndustryData(ind)
  let sells = id.producedMaterials
  let buys = Object.keys(id.requiredMaterials)
  if (!c.getCorporation().divisions.includes(name)) {
    await info(ns, "Creating a new %s division: %s", ind, name)
    c.expandIndustry(ind, name)
  }

  for (let city of cities) {
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
    if (!c.hasWarehouse(name, city)) {
      await info(ns, "Failed to buy warehouse in %s, skipping", city)
      return
    }
    if (c.getWarehouse(name, city).size == 0) {
      await upgradeWarehouse(ns, name, city, 1)
    }
    for (let m of buys) {
      c.setSmartSupply(name, city, true)
      c.setSmartSupplyOption(name, city, m, "leftovers")
    }
    let pid = ns.run("lib/corp/warehouseFactors.js", 1, name, city)
    while (ns.isRunning(pid)) {
      await ns.asleep(10)
    }
    if (sells?.length > 0) {
      for (let m of sells) {
        c.sellMaterial(name, city, m, "MAX", "MP")
      }
    }
  }

  let div = c.getDivision(name)
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

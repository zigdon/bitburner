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
const corp = "NotAVamp"
const industry = {
  ag: "Agriculture",
}
const names = {
  ag: "AgriVamp",
}

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("asleep")
  ns.clearLog()
  // Implementing the old guide from 
  // https://www.reddit.com/r/Bitburner/comments/ss609n/corporation_quick_guide_v140/
  if (!await createCorp(ns, corp)) { return }
  if (!await createDiv(ns, industry.ag, names.ag)) { return }
  if (!await unlock(ns, "Smart Supply")) { return }
  await expand(ns, names.ag, "Food", "Plants")
  await advert(ns, names.ag, 1)
  await buyUpgrades(ns, names.ag, [
    ["Smart Factories", 1],
    ["Wilson Analytics", 1],
    ["Project Insight", 1],
    ["FocusWires", 1],
    ["DreamSense", 1],
    ["ABC SalesBots", 1],
  ])
  for (var c of cities) {
    if (!await assign(
      ns, names.ag, c,
      {ops: 1, eng: 1, bus: 1, mgt: 1, rnd: 1, intern: 1})
    ) { return }
  }
  for (var c of cities) {
    await buyWarehouseFactors(ns, names.ag, c, industry.ag, 20)
  }
}

async function buyUpgrades(ns, name, upgrades) {
  let c = ns.corporation
  for (let [up, n] of upgrades) {
    ns.printf("Upgrading %s to %d", up, n)
    while (c.getUpgradeLevel(up) < n) {
      c.levelUpgrade(up)
      await ns.asleep(1000)
    }
  }
}

async function advert(ns, name, count) {
  ns.printf("Hiring ads for %s: %d", name, count)
  while (ns.corporation.getHireAdVertCount(name) < count) {
    ns.corporation.hireAdVert(name)
    await ns.asleep(10)
  }
}

async function createCorp(ns, name) {
  ns.printf("Creating corp %s", name)
  await run(ns, "lib/corp/create.js", name)
  return ns.corporation.hasCorporation()
}

async function createDiv(ns, ind, name) {
  if (ns.corporation.getCorporation().divisions.includes(name)) {
    ns.printf("%s division %s already exists", ind, name)
    return true
  }
  ns.printf("Creating %s division %s", ind, name)
  await run(ns, "lib/corp/createDiv.js", ind, name)
  return ns.corporation.getCorporation().divisions.includes(name)
}

async function unlock(ns, upgrade) {
  if (ns.corporation.hasUnlock(upgrade)) {
    ns.printf("Already have %s unlocked", upgrade)
    return true
  }
  ns.printf("Unlocking %s", upgrade)
  await run(ns, "lib/corp/unlock.js", upgrade)
  return ns.corporation.hasUnlock(upgrade)
}

async function setSmartSupply(ns, name, city, ...mats) {
  ns.printf("Settings smart supply for %s@s: %j", name, city, mats)
  await run(ns, "lib/corp/smartSupply.js", name, city, ...mats)
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

function upgradeWarehouse(ns, name, city, amt) {
  let c = ns.corporation
  c.upgradeWarehouse(name, city, amt)
  return true
}

function sellMat(ns, name, city, mat, amt, price) {
  let c = ns.corporation
  c.sellMaterial(name, city, mat, amt, price)
}

async function buyWarehouseFactors(ns, name, city, industry, amt) {
  ns.printf("Buying the right mix for %s in %s x %d", industry, city, amt)
  let c = ns.corporation
  let data = c.getIndustryData(industry)
  let target = {
    ai: data.aiCoreFactor * amt,
    robot: data.robotFactor * amt,
    hardware: data.hardwareFactor * amt,
    re: data.realEstateFactor * amt,
  }
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
    ns.printf("Current stock at %s:\n got: %j\nwant: %j", city, stock, target)
    if (stock.ai < target.ai) {
      cont = true
      shopping.push("AI")
      c.buyMaterial(name, city, "AI Cores", (target.ai-stock.ai)/10)
    } else {
      c.buyMaterial(name, city, "AI Cores", 0)
    }
    if (stock.robot < target.robot) {
      cont = true
      shopping.push("robots")
      c.buyMaterial(name, city, "Robots", (target.robot-stock.robot)/10)
    } else {
      c.buyMaterial(name, city, "Robots", 0)
    }
    if (stock.hardware < target.hardware) {
      cont = true
      shopping.push("hardware")
      c.buyMaterial(name, city, "Hardware", (target.hardware-stock.hardware)/10)
    } else {
      c.buyMaterial(name, city, "Hardware", 0)
    }
    if (stock.re < target.re) {
      cont = true
      shopping.push("real estate")
      c.buyMaterial(name, city, "Real Estate", (target.re-stock.re)/10)
    } else {
      c.buyMaterial(name, city, "Real Estate", 0)
    }
    ns.printf("Still waiting for %s", shopping.join(", "))
    await ns.asleep(500)
  }
}

async function expand(ns, name, ...mats) {
  for (let c of cities) {
    ns.printf("Expanding %s into %s", name, c)
    if (!ns.corporation.getDivision(name).cities.includes(c)) {
      if (ns.corporation.getCorporation().funds < 5000000000) {
        ns.printf("Not enough funds to expand %s to %s, skipping", name, c)
        continue
      }
      ns.printf("Expanding %s to %s", name, c)
      ns.corporation.expandCity(name, c)
    }
    if (!await assign(ns, name, c, {ops: 1, eng: 1, mgt: 1})) { return }
    if (!ns.corporation.hasWarehouse(name, c)) {
      ns.printf("Buying warehouse in %s", c)
      ns.corporation.purchaseWarehouse(name, c)
    }
    if (ns.corporation.getWarehouse(name, c).size == 0) {
      upgradeWarehouse(ns, name, c, 1)
    }
    for (let m of mats) {
      await setSmartSupply(ns, name, c, m)
      sellMat(ns, name, c, m, "MAX", "MP")
    }
    await buyWarehouseFactors(ns, name, c, industry.ag, 10)
  }
}

async function run(ns, cmd, ...args) {
  let pid = ns.run(cmd, 1, ...args)
  while (ns.isRunning(pid)) {
    ns.printf("Waiting for %j to finish (%d)", [cmd, ...args], pid)
    await ns.asleep(10)
  }
}

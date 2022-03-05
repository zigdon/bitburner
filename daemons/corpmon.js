import * as fmt from "/lib/fmt.js";
import { netLog, toast } from "/lib/log.js";
import { ports } from "/lib/ports.js";
import { expandOffice } from "/lib/corp.js";

const researchCity = "Aevum";
let util = {};

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.tail();

  if (ns.corporation.getCorporation().divisions.length == 0) {
    ns.tprintf("No divisions exist, exiting corpmon.");
    return;
  }

  let lastUpgrades = 0;
  let lastTick = 0;
  let utilReset = 0;
  await ns.writePort(ports.UI, "create corp Corp");
  while (true) {
    let now = Date.now();
    // check product development
    let progress = await devProducts(ns);

    // Keep track of warehouse utilisation
    if (now - utilReset > 300000) {
      util = {};
    }
    for (let d of ns.corporation.getCorporation().divisions) {
      util[d.name] ||= {};
      for (let c of d.cities) {
        util[d.name][c] ||= 0;
        if (!ns.corporation.hasWarehouse(d.name, c)) { continue; }
        let w = ns.corporation.getWarehouse(d.name, c);
        if (w.sizeUsed / w.size > util[d.name][c]) {
          util[d.name][c] = w.sizeUsed / w.size;
        }
      }
    }

    if (ns.corporation.getCorporation().funds != lastTick) {
      lastTick = ns.corporation.getCorporation().funds;
      // check product pricing
      await checkPrices(ns);
    }
    await printSummary(ns, progress);
    // check commands

    if (now - lastUpgrades > 60000) {
      await checkUpgrades(ns);
      lastUpgrades = now;
    }
    // buy gear?
    await ns.sleep(200);
  }
}

/**
 * @param {NS} ns
 */
async function checkUpgrades(ns) {
  // corp upgrades we want at at least lvl 20:
  let upgrades = [
    "FocusWires",
    "Neural Accelerators",
    "Speech Processor Implants",
    "Nuoptimal Nootropic Injector Implants",
    "Smart Factories",
    "Smart Storage",
  ];

  // Upgrades once we get up to speed
  let extraUpgrades = [
    "DreamSense",
    "Project Insight",
    "ABC SalesBots",
  ];

  let cur = upgrades.map(u => ({
    name: u,
    lvl: ns.corporation.getUpgradeLevel(u),
    cost: ns.corporation.getUpgradeLevelCost(u),
  }));
  if (cur.every(u => u.lvl >= 20)) {
    cur.push(...extraUpgrades.map(u => ({
      name: u,
      lvl: ns.corporation.getUpgradeLevel(u),
      cost: ns.corporation.getUpgradeLevelCost(u),
    })))
  }

  cur.sort((a, b) => a.cost - b.cost);
  let next = cur[0];
  if (cur.length > 0 && next.cost < ns.corporation.getCorporation().funds / cur.lvl < 20 ? 5 : 100) {
    await netLog(ns, "Upgrading %s to level %d for %s",
      next.name, next.lvl + 1, fmt.money(next.cost));
    ns.corporation.levelUpgrade(next.name);
  }

  if (ns.corporation.getUpgradeLevelCost("Wilson Analytics") < ns.corporation.getCorporation().funds / 5) {
    await netLog(ns, "Upgrading wilson level")
    ns.corporation.levelUpgrade("Wilson Analytics");
  }

  for (let div of ns.corporation.getCorporation().divisions) {
    for (let c of div.cities) {
      if (util[div.name][c] > 0.8 && ns.corporation.getUpgradeWarehouseCost(div.name, c) < (div.lastCycleRevenue - div.lastCycleExpenses) * 60) {
        await toast(ns, "Upgrading warehouse for %s in %s", div.name, c);
        ns.corporation.upgradeWarehouse(div.name, c);
        util[div.name][c] = 0;
      }
    }

    if (div.type == "Agriculture") {
      continue;
    }

    // If we can, research these:
    let goals = [
      "Hi-Tech R&D Laboratory",
      "Market-TA.I",
      "Market-TA.II",
      "Drones",
      "Overclock",
      "Drones - Assembly",
      "uPgrade: Fulcrum",
      "uPgrade: Capacity.I",
      "uPgrade: Capacity.II",
    ];

    for (let r of goals) {
      if (ns.corporation.hasResearched(div.name, r)) {
        continue;
      }
      if (ns.corporation.getResearchCost(div.name, r) < div.research) {
        await netLog(ns, "Researching %s at %s", r, div.name);
        ns.corporation.research(div.name, r);
      } else {
        break;
      }
    }

    let sizes = div.cities.map(c => ({ name: c, size: ns.corporation.getOffice(div.name, c).size })).filter(c => c.name != researchCity).sort((a, b) => a.size - b.size);
    let smallest = sizes[0];
    let upgrade = smallest.size / 3;
    if (upgrade < 9) { upgrade = 9; }
    if (smallest.size < ns.corporation.getOffice(div.name, researchCity).size / 9 &&
      ns.corporation.getOfficeSizeUpgradeCost(div.name, smallest.name, upgrade) < ns.corporation.getCorporation().funds / 5) {
      if (smallest.size < 100) {
        await toast(ns, "Upgrading sales office %s from %s for %s", smallest.name, fmt.large(smallest.size, { digits: 0 }), div.name);
      } else {
        await netLog(ns, "Upgrading sales office %s from %s for %s", smallest.name, fmt.large(smallest.size, { digits: 0 }), div.name);
      }
      ns.corporation.upgradeOfficeSize(div.name, smallest.name, upgrade);
      await hireSales(ns, div.name, smallest.name);
    }

    if (ns.corporation.getOfficeSizeUpgradeCost(div.name, researchCity, 15) < ns.corporation.getHireAdVertCost(div.name)) {
      await toast(ns, "Upgrading research office for %s", div.name);
      ns.corporation.upgradeOfficeSize(div.name, researchCity, 15);
      await hireResearchers(ns, div.name);
    }

    if (ns.corporation.getHireAdVertCost(div.name) < ns.corporation.getCorporation().funds / 5) {
      await netLog(ns, "Hiring AdVert for %s", div.name);
      ns.corporation.hireAdVert(div.name);
    }
  }
}

/*
* @param {NS} ns
* @param {object} progress 
*/
async function printSummary(ns, progress) {
  ns.clearLog();
  let corp = ns.corporation.getCorporation();
  ns.print(corp.name.toUpperCase() +
    `   Profits: ${fmt.money(corp.revenue - corp.expenses)}/s  Funds: ${fmt.money(corp.funds)}`);
  let offer = ns.corporation.getInvestmentOffer();
  if (offer.funds > 0) {
    ns.print(`Available invenstment offer: ${fmt.money(offer.funds)} for ${fmt.large(offer.shares)} shares`);
  }

  let data = [];
  for (let div of corp.divisions) {
    data.push([
      div.name,
      div.type,
      div.lastCycleRevenue - div.lastCycleExpenses,
      div.prodMult,
      Object.keys(progress).includes(div.name) ? fmt.pct(progress[div.name]) : "N/A",
    ])
  }
  ns.print(fmt.table(data, [
    "division name", "type", ["profits", fmt.money],
    ["production", fmt.large], "Product Dev",
  ]))
  await ns.writePort(ports.UI, `update corp ${fmt.money(corp.revenue - corp.expenses)}/s`);
}

/** @param {NS} ns **/
async function checkPrices(ns) {
  // for each product, get the current price and inventory
  // if the price is 0, set it to... something
  // if the delta is positive, reduce price
  // if the delta is <10? increase price
  let corp = ns.corporation.getCorporation();
  for (let div of corp.divisions) {
    let prods = div.products.map(p => [p, ns.corporation.getProduct(div.name, p)]);
    for (let [name, p] of prods) {
      if (p.developmentProgress < 100) {
        continue;
      }
      // If we have a good AI, we're all good
      if (ns.corporation.hasResearched(div.name, "Market-TA.II")) {
        ns.corporation.setProductMarketTA1(div.name, name, false);
        ns.corporation.setProductMarketTA2(div.name, name, false);
        // continue;
      }
      if (p.sCost == 0) {
        // Set a default
        ns.corporation.sellProduct(div.name, researchCity, name, "MAX", "MP*10", true);
        continue;
      }
      let stk = Object.values(p.cityData);
      let qty = Math.max(...stk.map(s => s[0].toFixed(2)));
      let deltas = stk.map(s => (s[1] - s[2]).toFixed(2));
      let min = Math.min(...deltas);
      let max = Math.max(...deltas);
      let m = Number(p.sCost.substr(3));
      let changed = false;
      if (min > 10 || qty > 1000) {  // price is too high
        m *= .8;
        await netLog(ns, "Reducing price of %s to MP*%.2f", name, m);
        changed = true;
      } else if (max < -10 || qty < 10) {
        m *= 1.5;
        await netLog(ns, "Increasing price of %s to MP*%.2f", name, m);
        changed = true;
      }
      if (m == 0) {
        m = 10;
        changed = true;
      }
      if (changed) {
        await netLog(ns, `Setting price of ${name} to MP*${m.toFixed(2)}`);
        ns.corporation.sellProduct(div.name, researchCity, name, "MAX", "MP*" + m.toFixed(2), true);
      }
    }
  }
}

/** @param {NS} ns **/
async function devProducts(ns) {
  const products = {
    "Tobacco": {
      name: "Totally Safe Inc",
      products: ["Total Lungs", "Total Heart", "Total Voice"],
      gens: ["", "II", "Delux", "Classic", "Ltd Ed", "2000", "Retro", "X-3000", "DLX"],
    },
    "Software": {
      name: "Totally Works Inc",
      products: ["Total Vaporware", "Total Feature", "Total VR"],
      gens: ["0.1", "0.5", "beta", "1.0", "Enterprise", "Delux", "2000", "25"],
    },
    "Food": {
      name: "Totally Organic Inc",
      products: ["Total Food Product", "Total Drink Product", "Total Nutrition"],
      gens: ["", "II", "Delux", "Organic", "Zero", "Free", "Diet"],
    },
  }
  let progress = {};
  let corp = ns.corporation.getCorporation();
  for (let div of corp.divisions) {
    let type = div.type;
    if (!products[type]) {
      continue;
    }
    let prods = div.products.map(p => ns.corporation.getProduct(div.name, p));
    let p = Math.min(...prods.map(p => p.developmentProgress));
    if (p < 100) {
      progress[div.name] = p / 100;
      continue;
    }

    let budget = corp.funds / 100;
    if (budget < 1e9) {
      await netLog(ns, "Not enough funds to create new products for %s", div.name);
      return progress;
    }

    let pName = getNextProduct(products[type], div.products);
    if (!pName) {
      return progress;
    }
    let notice = ns.corporation.getCorporation().revenue < 1e9 ? toast : netLog;
    let productLimit = 3;
    if (ns.corporation.hasResearched(div.name, "uPgrade: Capacity.I")) { productLimit++; }
    if (ns.corporation.hasResearched(div.name, "uPgrade: Capacity.II")) { productLimit++; }
    if (div.products.length == productLimit) {
      let dName = div.products.map(p => [p, ns.corporation.getProduct(div.name, p).dmd])
        .sort((a, b) => a[1] - b[1])
        .map(p => p[0])[0];
      await notice(ns, "Discontinuing product for %s: %s", div.name, dName);
      ns.corporation.discontinueProduct(div.name, dName);
    }

    await notice(ns, "Creating new product for %s: %s", div.name, pName);
    ns.corporation.makeProduct(div.name, researchCity, pName, budget, budget);
    progress[div.name] = 0;
  }
  return progress;
}

/**
 * @param {object} def
 * @param {string[]} cur
 */
function getNextProduct(def, cur) {
  for (let c of cur) {
    let type = def.products.find(p => c.startsWith(p))
    let iter = type.split("/")[1] || 0;
    let gen = c.substr(type.length + 1).split("/")[0] || "";
    let tID = def.products.indexOf(type);
    let gID = def.gens.indexOf(gen);
    type = def.products[tID + 1];
    if (!type) {
      // next gen!
      type = def.products[0];
      gen = def.gens[gID + 1];
      if (!gen) {
        iter++;
        gen = def.gens[0] + "/" + iter;
      }
    }
    let next = type + " " + gen;
    if (!cur.includes(next)) {
      return next;
    }
  }

  return false;
}

/**
 * @param {NS} ns
 * @param {string} name
 */
async function hireResearchers(ns, name) {
  // get office size
  const size = ns.corporation.getOffice(name, researchCity).size;
  let sets = Math.floor(size / 5);
  let left = size % 5;
  let target = {
    "Business": sets,
    "Engineer": sets + left,
    "Operations": sets,
    "Management": sets,
    "Research & Development": sets,
  }

  await expandOffice(ns, name, researchCity, target);
}

/**
 * @param {NS} ns
 * @param {string} name
 * @param {string} city
 */
async function hireSales(ns, name, city) {
  // get office size
  const size = ns.corporation.getOffice(name, city).size;
  let sets = Math.floor(size / 9);
  let left = size % 9;
  let target = {
    "Business": sets,
    "Engineer": sets * 2 + left,
    "Operations": sets * 2,
    "Management": sets * 2,
    "Research & Development": sets * 2,
  }

  await expandOffice(ns, name, city, target);
}
import { netLog, toast, console } from "/lib/log.js";
import { materials } from "/lib/constants.js";
import * as fmt from "/lib/fmt.js";

export const materialStock = {
  "Agriculture": {
    "Food": { autosale: true },
    "Plants": { autosale: true },
    "Hardware": { autosale: false, goal: 9300 },
    "Robots": { autosale: false, goal: 726 },
    "AI Cores": { autosale: false, goal: 6270 },
    "Real Estate": { autosale: false, goal: 230400 },
  },
  "Tobacco": {},
  "Software": {
    "AI Cores": { autosale: true },
  },
  "Food": {},
  "RealEstate": {
    "Real Estate": { autosale: true },
  },
}

/**
 * @param {NS} ns
 * @param {string} name
 * @param {string[]} cities
 * @param {object} order
 **/
export async function buyHardware(ns, name, cities, order) {
  if (typeof(cities) == "string") { cities = [cities]; }
  let log = async (t, ...a) => await netLog(ns, t, ...a);
  let shopping = true;
  while (shopping) {
    await waitForTick(ns);
    shopping = false;
    await log("shopping report:");
    for (let city of cities) {
      for (let [m, q] of Object.entries(order)) {
        let cur = ns.corporation.getMaterial(name, city, m).qty;
        let missing = q-cur;
        if (Math.abs(missing) / q > 0.1) {
          shopping = true;
          await log("%s: Missing %s %s", city, fmt.large(missing), m);
          if (missing > 0) {
            ns.corporation.buyMaterial(name, city, m, missing/10);
            ns.corporation.sellMaterial(name, city, m, 0, "MP");
          } else {
            ns.corporation.sellMaterial(name, city, m, -missing/10, "0");
            ns.corporation.buyMaterial(name, city, m, 0);
          }
        } else {
          ns.corporation.buyMaterial(name, city, m, 0);
          ns.corporation.sellMaterial(name, city, m, 0, "MP");
        }
      }
    }
  }

  for (let city of cities) {
    for (let m of Object.keys(order)) {
      ns.corporation.buyMaterial(name, city, m, 0);
      ns.corporation.sellMaterial(name, city, m, 0, "MP");
    }
  }
}

/**
 * @param {NS} ns
 * @param {number} amt
 * @param {number} round
 * @param {object} ui
 */
export async function getInvestment(ns, amt, round, ui) {
  let log = async (t, ...a) => await netLog(ns, t, ...a);
  let out = async (t, ...a) => await console(ns, t, ...a);
  if (ns.corporation.getInvestmentOffer().round != round) {
    await log("Wrong investment round, wanted %d, was offered %d", round, ns.corporation.getInvestmentOffer().round);
    return true;
  }
  await out("Waiting for a round %d investment of %s+ (adjusted by BN to %s)...",
      round, fmt.money(amt), fmt.money(amt*ns.getBitNodeMultipliers().CorporationValuation));
  amt *= ns.getBitNodeMultipliers().CorporationValuation;
  let fraudAttempt = 0;
  let best = 0;
  while (true) {
    await waitForTick(ns);
    let offer = ns.corporation.getInvestmentOffer();
    best = Math.max(best, offer.funds);
    await ui.update(`${fmt.money(offer.funds)}/${fmt.money(amt)} (best ${fmt.money(best)})`);
    if (offer.funds >= amt) { break; }
    await log("Current investment offer: %s for %s shares", fmt.money(offer.funds, 2), fmt.large(offer.shares));
    if (Date.now() - fraudAttempt > 60000) {
      fraudAttempt = Date.now();
      await log("Attempting bank fraud...");
      for (let div of ns.corporation.getCorporation().divisions) {
        for (let city of div.cities) {
          for (let mat of Object.keys(materials)) {
            ns.corporation.sellMaterial(div.name, city, mat, "MAX", "MP");
          }
        }
      }
      await waitForTick(ns);
      for (let div of ns.corporation.getCorporation().divisions) {
        for (let city of div.cities) {
          for (let mat of Object.keys(materials)) {
            ns.corporation.sellMaterial(div.name, city, mat, 0, "MP");
          }
        }
      }
      let ready = false;
      while (!ready) {
        ready = true
        let warehouses = [];
        for (let div of ns.corporation.getCorporation().divisions) {
          for (let city of div.cities) {
            if (!ns.corporation.hasWarehouse(div.name, city)) { continue }
            let w = ns.corporation.getWarehouse(div.name, city);
            warehouses.push(w.sizeUsed/w.size*100);
            if (w.sizeUsed/w.size < 0.9) {
              ready = false;
            }
          }
        }
        let min = Math.min(warehouses);
        await log("Building up stock, warehouses at %s", warehouses.map(w => w.toFixed(0) + "%").join("/"));
        await waitForTick(ns);
      }
      await log("Selling all built up stock!");
      await ui.update("Selling!");
      for (let div of ns.corporation.getCorporation().divisions) {
        for (let city of div.cities) {
          for (let mat of Object.keys(materials)) {
            ns.corporation.sellMaterial(div.name, city, mat, "MAX", "MP");
          }
        }
      }
      ready = false;
      while (!ready) {
        ready = true
        let warehouses = [];
        for (let div of ns.corporation.getCorporation().divisions) {
          for (let city of div.cities) {
            if (!ns.corporation.hasWarehouse(div.name, city)) { continue }
            let w = ns.corporation.getWarehouse(div.name, city);
            warehouses.push(w.sizeUsed/w.size*100);
            if (w.sizeUsed/w.size > 0.1) {
              ready = false;
            }
          }
        }
        await log("Selling stock, warehouses at %s", warehouses.map(w => w.toFixed(0) + "%").join("/"));
        offer = ns.corporation.getInvestmentOffer();
        best = Math.max(best, offer.funds);
        await ui.update(`${fmt.money(offer.funds)}/${fmt.money(amt)} (best ${fmt.money(best)})`);
        if (offer.funds >= amt) { break; }
        await waitForTick(ns);
      }
    }
  }

  if (!ns.corporation.acceptInvestmentOffer()) {
    await out("Failed to take investment!");
    return false;
  }

  await log("Current corp funds: %s", fmt.money(ns.corporation.getCorporation().funds));
  return true;
}

/**
 * @param {NS} ns
 * @param {string} upgrade
 **/
export async function unlockUpgrade(ns, upgrade) {
  let log = async (t, ...a) => await netLog(ns, t, ...a);
  if (ns.corporation.hasUnlockUpgrade(upgrade)) {
    await log("%s already unlocked", upgrade);
    return;
  }
  let cost = ns.corporation.getUnlockUpgradeCost(upgrade);
  await log("Waiting for %s to unlock %s", fmt.money(cost), upgrade);
  while (cost > ns.corporation.getCorporation().funds) {
    await ns.sleep(10000);
  }
  await log("Unlocking %s", upgrade);
  ns.corporation.unlockUpgrade(upgrade);
}

/**
 * @param {NS} ns
 * @param {string} upgrade
 * @param {number} level
 **/
export async function levelUpgrade(ns, upgrade, level) {
  let log = async (t, ...a) => await netLog(ns, t, ...a);
  while (ns.corporation.getUpgradeLevel(upgrade) < level) {
    let cost = ns.corporation.getUpgradeLevelCost(upgrade);
    await log("Waiting for %s to unlock next level of %s", fmt.money(cost), upgrade);
    while (cost > ns.corporation.getCorporation().funds) {
      await ns.sleep(10000);
    }
    await log("Unlocking %s level %d", upgrade, ns.corporation.getUpgradeLevel(upgrade)+1);
    ns.corporation.levelUpgrade(upgrade);
  }
}

/**
 * @param {NS} ns
 * @param {string} div
 * @param {string} city
 * @param {object} staff
 */
export async function expandOffice(ns, div, city, staff) {
  let log = async (t, ...a) => await netLog(ns, t, ...a);
  let out = async (t, ...a) => await console(ns, t, ...a);

  let office = ns.corporation.getOffice(div, city);
  let allPos = ["Operations", "Engineer", "Business", "Management", "Research & Development", "Unassigned"];

  await log("Staffing %s: %s", city, allPos.map(p => `${p}: ${staff[p] || 0}`).join(", "));

  let cur = {};
  allPos.forEach(p => cur[p] = []);
  office.employees.forEach(e => { let p = ns.corporation.getEmployee(div, city, e).pos; cur[p] ||= []; cur[p].push(e) });
  let missing = {};
  let headCount = 0;
  for (let p of allPos) {
    await log("%s: currrently have %d, want %d", p, cur[p].length, staff[p] || 0);
    if (cur[p].length < staff[p]) {
      missing[p] = staff[p] - cur[p].length;
      headCount += missing[p];
    }
  }

  if (headCount == 0) {
    return;
  }
  await log("Missing: %s", allPos.map(p => `${p}: ${missing[p] || 0}`).join(", "));
  if (headCount + office.employees.length - cur["Unassigned"].length > office.size) {
    await log("Expanding office size to allow %d new hires", headCount - cur["Unassigned"].length);
    while (headCount + office.employees.length - cur["Unassigned"].length > office.size) {
      await ns.sleep(1);
      let origSize = office.size;
      ns.corporation.upgradeOfficeSize(div, city, 3);
      office = ns.corporation.getOffice(div, city);
      if (office.size == origSize) {
        await log("Waiting for funds to upgrade office in %s further", city);
        await ns.sleep(10000);
      }
    }
  }

  // Assign any unassigned emps
  while (cur["Unassigned"].length > 0) {
    for (let p of allPos) {
      while (missing[p] > 0 && cur["Unassigned"].length > 0) {
        await log("Assigning unassigned worker to %s", p)
        await ns.corporation.assignJob(div, city, cur["Unassigned"].shift(), p);
        continue
      }
    }
    await log("No more missing workers!");
    return;
  }

  // Hire more people
  for (let p of allPos) {
    if (!missing[p] || missing[p] == 0) { continue }
    await log("Hiring %d employee for %s/%s at %s", missing[p], div, p, city);
    while (missing[p] > 0) {
      let e = ns.corporation.hireEmployee(div, city);
      if (!e) {
        await out("Couldn't hire for %s at %s", p, city);
        return;
      }
      await ns.corporation.assignJob(div, city, e.name, p);
      missing[p]--;
    }
  }

  return;
}

/** @param {NS} ns */
export async function waitForTick(ns) {
  while (ns.corporation.getCorporation().state != "START") {
    await ns.sleep(100);
  }
  while (ns.corporation.getCorporation().state == "START") {
    await ns.sleep(100);
  }
}
import { netLog, toast, console } from "/lib/log.js";
import { materials } from "/lib/constants.js";
import * as fmt from "/lib/fmt.js";

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
      ns.corporation.upgradeOfficeSize(div, city, 3);
      office = ns.corporation.getOffice(div, city);
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

export async function waitForTick(ns) {
  while (ns.corporation.getCorporation().state != "START") {
    await ns.sleep(100);
  }
  while (ns.corporation.getCorporation().state == "START") {
    await ns.sleep(100);
  }
}

let state = {
  "Tobacco": { "Hardware": null, "Robots": null, "AI Cores": null, "Real Estate": null },
  "Software": { "Hardware": null, "Robots": null, "AI Cores": null, "Real Estate": null },
  "Food": { "Hardware": null, "Robots": null, "AI Cores": null, "Real Estate": null },
}
/**
 * @param {NS} ns
 * @param {Division} div
 */
export async function researchHardware(ns, div) {
  // buy a unit of each
  // keep track of how much bonus we get
  // buy more of the best production, until the effect drops
  if (!state[div.type]) {
    await toast(ns, "Can't research hardware for %s division.", div.type, { level: "error" });
    return;
  }

  let initialProd = ns.corporation.getDivision(div.name).prodMult;

  // pick the city with the least hardware
  let city = await pickCity(ns, div.name);
  let mats = Object.keys(state[div.type]).filter(k => !k.startsWith("_"))
  let totals = {};
  // Figure out what helps the most
  for (let m of mats) {
    let prod = ns.corporation.getDivision(div.name).prodMult;
    ns.corporation.buyMaterial(div.name, city, m, 1/materials[m]);
    await waitForTick(ns);
    let cur = ns.corporation.getMaterial(div.name, city, m).qty;
    ns.corporation.buyMaterial(div.name, city, m, 0);
    await waitForTick(ns);
    state[div.type][m] = ns.corporation.getDivision(div.name).prodMult - prod;
    prod = ns.corporation.getDivision(div.name).prodMult;
    ns.corporation.sellMaterial(div.name, city, m, 1/materials[m], "1");
    await waitForTick(ns);
    ns.corporation.sellMaterial(div.name, city, m, "0", "0");
    await waitForTick(ns);
    ns.print(`${div.name}/${city}: Buying ${fmt.large(1/materials[m])} of ${m} changed prod by ${state[div.type][m].toFixed(2)}`);
  }

  let mults = Object.entries(state[div.type])
    .filter(k => !k[0].startsWith("_"))
    .sort((a, b) => b[1] - a[1])

  // Keep buying the first type of hardware until it's effects on the mult diminish
  let mat = mults[0][0];
  let unit = 10 / materials[mat];
  if (!unit) {
    await toast(ns, "Don't know how much %s to buy", mat, { level: "error" });
    return;
  }
  let loop = 20;
  while (loop > 0) {
    await toast(ns, "Buying %s of %s at %s", fmt.large(unit), mat, city);
    totals[mat] ||= 0;
    totals[mat] += unit;
    let prod = ns.corporation.getDivision(div.name).prodMult;
    ns.print(`Current prod: ${prod}`);
    let cur = ns.corporation.getMaterial(div.name, city, mat).qty;
    ns.print(`Current inventory: ${fmt.large(cur)}, buying ${unit}`);
    ns.corporation.buyMaterial(div.name, city, mat, unit);
    await waitForTick(ns);
    cur = ns.corporation.getMaterial(div.name, city, mat).qty;
    ns.corporation.buyMaterial(div.name, city, mat, 0);
    await waitForTick(ns);
    let diff = ns.corporation.getDivision(div.name).prodMult - prod;
    prod = ns.corporation.getDivision(div.name).prodMult;
    ns.print(`ProdMult: ${prod.toFixed(2)}; Delta: ${diff.toFixed(2)}`);
    if (diff < mults[1][1] || diff < mults[0][1] / 2) {
      state[div.type][mat] = diff;
      mults = Object.entries(state[div.type])
        .filter(k => !k[0].startsWith("_"))
        .sort((a, b) => b[1] - a[1])
      mat = mults[0][0];
      unit = 1 / materials[mat];
      loop--;
    }
    if (mults[1][1] < 0.01) {
      break;
    }
    await ns.sleep(100);
  }

  ns.print(`After 1 city, prod moved from ${initialProd.toFixed(2)} to ${ns.corporation.getDivision(div.name).prodMult.toFixed(2)}`)
  ns.print("Overall purchases:");
  for (let [k,v] of Object.entries(totals)) {
    ns.print(`  ${k}: ${fmt.large(v)}`);
  }

  // Now buy the same amounts everywhere else
  for (let c of div.cities) {
    if (c == city) { continue }
    for (let [k,v] of Object.entries(totals)) {
      ns.corporation.buyMaterial(div.name, c, k, v/10);
    }
  }
  await waitForTick(ns);
  for (let c of div.cities) {
    if (c == city) { continue }
    for (let [k,v] of Object.entries(totals)) {
      ns.corporation.buyMaterial(div.name, c, k, 0);
    }
  }

  ns.print(`Prod overall moved from ${initialProd.toFixed(2)} to ${ns.corporation.getDivision(div.name).prodMult.toFixed(2)}`)

}

/**
 * @param {NS} ns
 * @param {string} divName
 */
async function pickCity(ns, divName) {
  let city = ns.corporation.getDivision(divName).cities
    .map(c => ({ name: c, warehouse: ns.corporation.getWarehouse(divName, c) }))
    .sort((a, b) => a.warehouse.sizeUsed - b.warehouse.sizeUsed)[0];
  // Add space in the warehouse if needed
  if (city.warehouse.size - city.warehouse.sizeUsed < 500) {
    await toast(ns, "Upgrading warehouse in %s for hardware", city.name);
    ns.corporation.upgradeWarehouse(divName, city.name);
  }
  Object.keys(materials).forEach(m => ns.corporation.sellMaterial(divName, city.name, m, 0, "MP"));

  return city.name;
}
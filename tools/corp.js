import * as fmt from "/lib/fmt.js";
import { cities, materials } from "/lib/constants.js";
import { console, netLog } from "/lib/log.js";
import { expandOffice, researchHardware } from "/lib/corp.js";

let out;
let log;

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  let cmd = ns.args.shift();
  out = async (t, ...a) => await console(ns, t, ...a);
  log = async (t, ...a) => await netLog(ns, t, ...a);

  let div;
  switch (cmd) {
    case "hardware":
      div = await getDiv(ns, ns.args.shift());
      ns.print("Running research cycle");
      await researchHardware(ns, div)
      ns.print("Running buy cycle");
      await researchHardware(ns, div)
      break;
    case "fraud":
      await investmentFraud(ns);
      break;
    case "info":
      await printInfo(ns);
      break;
    case "div":
    case "division":
      div = await getDiv(ns, ns.args.shift());
      if (!div) { return }
      if (div.name) {
        await printDiv(ns, div.name);
      } else {
        await listDivs(ns);
      }
      break;
    case "office":
      div = await getDiv(ns, ns.args.shift());
      if (!div) { return }
      let branch = branchName(ns, ns.args.shift());
      if (!branch) {
        await listOffices(ns, div.name)
      } else {
        await printOffice(ns, div.name, branch);
      }
      break;
    case "product":
    case "products":
      div = await getDiv(ns, ns.args.shift());
      if (!div) { return }
      await printProducts(ns, div.name);
      break;
    case "createDiv":
      await createDiv(ns, ns.args.shift());
      break;
    case "sell":
      div = await getDiv(ns, ns.args.shift());
      let [mat, qty, price] = ns.args;
      if (!div) {
        await listDivs(ns);
        return;
      }
      await setSale(ns, div.name, mat, qty, price, div.cities);
      break;
    default:
      await out("Unknown command: %s", cmd);
      return;
  }
}

/**
 * @param {NS} ns
 * @param {String} name
 */
async function branchName(ns, name) {
  if (!name) {
    await out("Unknown city. Pick one of %s.", cities.join(", "));
    return false;
  }
  let found = cities.find(c => name[0].toLowerCase() == c[0].toLowerCase());
  if (!found) {
    await out("Unknown city '%s'. Pick one of %s.", name, cities.join(", "));
    return false;
  }
  return found;
}

/**
 * @param {NS} ns
 * @param {String} name
 */
async function getDiv(ns, name) {
  if (!name) {
    await listDivs(ns);
    return false
  }

  let matches = ns.corporation.getCorporation().divisions.filter(
    d => d.name.toLowerCase().includes(name.toLowerCase()))
  if (matches.length == 0) {
    await out("Unknown division %s", name);
    return await listDivs(ns);
  } else if (matches.length > 1) {
    await out("Possible matches: ", matches.join(", "));
    return;
  }

  return matches[0];
}

/**
 * @param {NS} ns
 * @param {String} div
 */
async function printProducts(ns, div) {
  let products = ns.corporation.getDivision(div).products;
  /*
               name | Total Heart 2000
                dmd | 86.56664700889277
                cmp | 3.3899999999998225
              pCost | 12085.289344007258
              sCost | MP*220
           cityData | Aevum,0,47.01002192786718,47.01002192786718, Chongqing,0,34.33062663216696,34.33062663216696, Ishima,0,35.114365202309074,35.114365202309074, New Tokyo,0,34.58380426191991,34.58380426191991, Sector-12,0,34.08221751614316,34.08221751614316, Volhaven,0,34.380313335907545,34.380313335907545
developmentProgress | 100.1351346264278
  */
  let data = [];
  for (let pName of products) {
    let p = ns.corporation.getProduct(div, pName);
    data.push([
      p.name, p.dmd, p.cmp, p.pCost, p.sCost,
      Object.values(p.cityData).map(c => fmt.large(c[0])).join("/"),
      p.developmentProgress / 100
    ])
  }
  await out(fmt.table(data,
    ["name", ["demand", fmt.large], ["competition", fmt.large],
      ["prod$", fmt.money], "sale$", "inventory",
      ["dev %%", (n) => fmt.pct(n, 0, true)]]
  ));
}

/**
 * @param {NS} ns
 * @param {String} div
 */
async function listOffices(ns, div) {
  let data = [];
  for (let city of ns.corporation.getDivision(div).cities) {
    let office = ns.corporation.getOffice(div, city);
    let warehouse = ns.corporation.getWarehouse(div, city);
    data.push([
      office.loc, `${office.employees.length}/${office.size}`,
      warehouse.sizeUsed / warehouse.size, warehouse.size,
    ])
  }
  await out(fmt.table(data,
    ["Location", "Employees",
      ["Warehouse util", (n) => fmt.pct(n, 0, true)], ["Warehouse size", fmt.large]],
  ));
}

/**
 * @param {NS} ns
 * @param {String} div
 * @param {String} branch
 */
async function printOffice(ns, div, branch) {
  let office = ns.corporation.getOffice(div, branch);
  await out("%s @ %s", div, branch);
  await out("Employees: %d/%d", office.employees.length, office.size);
  await out("Productivity:\n%s",
    Object.entries(office.employeeProd)
      .map(p => `  ${p[0]}: ${fmt.large(p[1] || 0)}`).join("\n"));
}

/**
 * @param {NS} ns
 * @param {String} name
 */
async function printDiv(ns, name) {
  let div = await getDiv(ns, name);
  await out("%s (%s)", div.name.toUpperCase(), div.type);
  await out("Awareness: %s  Popularity: %s  Research: %s",
    fmt.large(div.awareness), fmt.large(div.popularity), fmt.large(div.research));
  await out("Revenue: %s  Expenses: %s  Profit: %s/s",
    fmt.money(div.lastCycleRevenue), fmt.money(div.lastCycleExpenses),
    fmt.money(div.lastCycleRevenue - div.lastCycleExpenses));
  await out("Production multiplier: %s", fmt.large(div.prodMult));
  await out("Cities: %s", div.cities.join(", "));
  await out("Products:");
  for (let p of div.products) {
    await out("  %s", p);
  }
}

/**
 * @param {NS} ns
 */
async function listDivs(ns) {
  let ds = ns.corporation.getCorporation().divisions;
  await out("Divisions: %d", ds.length);
  for (let d of ds) {
    let profit = d.lastCycleRevenue - d.lastCycleExpenses;
    await out("  %s: %s %s",
      d.name, d.type,
      fmt.money(profit),
    )
  }
}

/**
 * @param {NS} ns
 */
async function printInfo(ns) {
  let i = ns.corporation.getCorporation();
  await out(`funds: ${fmt.money(i.funds)}`);
  await out(`revenue: ${fmt.money(i.revenue)}`);
  await out(`expenses: ${fmt.money(i.expenses)}`);
  await out(`profits: %s/s`,
    fmt.money(i.revenue - i.expenses),
  );
  await out(`shares: ${fmt.int(i.totalShares, { digits: 0 })}`);
  await out(`owned: ${fmt.int(i.numShares, { digits: 0 })}`);
  await out(`issued: ${fmt.int(i.issuedShares, { digits: 0 })}`);
  if (i.shareSaleCooldown > 0) {
    await out(`cooldown: ${fmt.time(i.shareSaleCooldown)}`);
  }
  await out(`price: ${fmt.money(i.sharePrice)}`);
  let ds = i.divisions;
  await out("Divisions: %d", ds.length);
  for (let d of ds) {
    let profit = d.lastCycleRevenue - d.lastCycleExpenses;
    await out("  %s: %s %s",
      d.name, d.type,
      fmt.money(profit),
    )
  }
}

/**
 * @param {NS} ns
 * @param {string} name
 * @param {string} mat
 * @param {string} qty
 * @param {string} price
 * @param {string[]} cities
 * 
 */
async function setSale(ns, name, mat, qty = "MAX", price = "MP", cities) {
  if (Object.keys(materials).indexOf(mat) == -1) {
    mat = Object.keys(materials).map(m => [m, m.toLowerCase()]).find(m => m[1].includes(mat))[0]
  }
  await out("Setting %s to sell %s in %s...", name, mat, cities);
  for (let c of cities) {
    ns.corporation.sellMaterial(name, c, mat, qty, price)
  }
}

/**
 * @param {NS} ns
 * @param {string} type
 */
async function createDiv(ns, type) {
  let divs = {
    "Tobacco": { name: "Totally Safe Inc", product: "Total Lungs", autosale: [] },
    "Software": { name: "Totally Works Inc", product: "Total Vaporware", autosale: ["AI Cores"] },
    "Food": { name: "Totally Organic Inc", product: "Total Food Product", autosale: [] },
  }
  if (!type) {
    await out("Type is required, one of: %s", Object.keys(divs));
    return;
  }
  ns.tail();
  type = type[0].toUpperCase() + type.substr(1);

  let name = divs[type].name;
  if (!name) {
    await out("Unknown type: %s", type);
    return;
  }

  if (!ns.corporation.getCorporation().divisions.find(d => d.type == type)) {
    await log("Creating new division %s: %s", type, name);
    ns.corporation.expandIndustry(type, name);
  }

  let div = ns.corporation.getDivision(name);
  if (!div) {
    await out("Failed to create division!");
    return;
  }

  for (let c of cities) {
    if (div.cities.includes(c)) {
      await log("Found office in %s", c);
      continue;
    }
    await log("Expanding to %s", c);
    ns.corporation.expandCity(name, c)
  }

  // Reserch office in Aevum, sales elsewhere
  let rName = "Aevum";
  for (let c of cities) {
    if (c == rName) {
      await expandOffice(ns, name, c, {
        "Operations": 6,
        "Engineer": 6,
        "Business": 6,
        "Management": 6,
        "Research & Development": 6,
      });
    } else {
      await expandOffice(ns, name, c, {
        "Operations": 2,
        "Engineer": 2,
        "Business": 1,
        "Management": 2,
        "Research & Development": 2,
      });
    }

    // Make sure we have a warehouse
    if (!ns.corporation.hasWarehouse(name, c)) {
      await log("Getting warehouse in %s", c);
      ns.corporation.purchaseWarehouse(name, c)
    }
    if (!ns.corporation.getWarehouse(name, c).smartSupplyEnabled) {
      await log("Enabling smart supply at %s", c);
      ns.corporation.setSmartSupply(name, c, true);
    }
    while (ns.corporation.getWarehouse(name, c).size < 1000) {
      await log("Expanding warehouse at %s", c);
      ns.corporation.upgradeWarehouse(name, c);
    }
    for (let p of divs[type].autosale) {
      await log("Enabling autosale of %s in %s", p, c);
      ns.corporation.sellMaterial(name, c, p, "MAX", "MP");
    }
  }

  // Start working on the first product
  await log("Starting work on pilot product %s", divs[type].product);
  ns.corporation.makeProduct(name, "Aevum", divs[type].product, 1e9, 1e9);
}

/**
 * @param {NS} ns
 */
async function investmentFraud(ns) {
  let mp = (p, m) => `MP*${p.split("*")[1]*m}`
  // record curren prices for everything
  let pre = [];
  for (let d of ns.corporation.getCorporation().divisions) {
    pre.push(...d.products.map(p => ({ name: p, div: d.name, price: ns.corporation.getProduct(d.name, p).sCost })))
    Object.keys(materials).forEach(m => ns.corporation.sellMaterial(d.name, "Sector-12", m, 0, "MP"));
  }
  for (let p of pre) {
    ns.tprint(p);
  }
  // stop sales of all products (and materials) in all divisions
  for (let p of pre) {
    if (!p.price) { continue }
    ns.corporation.sellProduct(p.div, "Sector-12", p.name, 0, mp(p.price, 0.9), true);
  }
  // wait until all the warehouses are full (or stop filling)
  let last = {};
  let ready = false;
  while (!ready) {
    let now = Date.now();
    let data = [];
    for (let d of ns.corporation.getCorporation().divisions) {
      for (let w of d.cities.map(c => (
        { div: d.name, city: c, used: ns.corporation.getWarehouse(d.name, c).sizeUsed, total: ns.corporation.getWarehouse(d.name, c).size }
      ))) {
        let k = `${w.div}/${w.city}`;
        if (!last[k] || last[k].used < w.used) {
          last[k] = {used: w.used, ts: now, ready: false};
        } else if (now - last[k].ts > 20000) {
          last[k].ready = true;
        }
        data.push([w.div, w.city, last[k].used, now-last[k].ts, last[k].ready, w.used/w.size*100]);
      }
    }
    ns.tprintf(fmt.table(data, ['div', 'city', ['used', fmt.large], ['age', fmt.time], 'ready', 'pct']))
    await ns.sleep(1000);
    ready = Object.values(last).every(l => l.ready);
  }

  // restore all sales to 90% of their original values
  for (let p of pre) {
    ns.corporation.sellProduct(p.div, "Sector-12", p.name, "MAX", mp(p.price, 0.9), true);
  }
  for (let d of ns.corporation.getCorporation().divisions) {
    Object.keys(materials).forEach(m => ns.corporation.sellMaterial(d.name, "Sector-12", m, "MAX", "MP"));
  }

  // monitor investment offers
  let start = Date.now();
  let prev = 0;
  while (Date.now() - start < 30000) {
    let cur = ns.corporation.getInvestmentOffer().funds
    if (prev != cur) {
      prev = cur;
      ns.tprint(fmt.money(cur))
    }
  }

  // profit

  // Restore to 100%
  for (let p of pre) {
    ns.corporation.sellProduct(p.div, "Sector-12", p.name, "MAX", p.price, true);
  }
}
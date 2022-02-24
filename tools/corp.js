import * as fmt from "/lib/fmt.js";

const cities = ["Aevum", "Chongqing", "Ishima", "New Tokyo", "Sector-12", "Volhaven"];

/** @param {NS} ns **/
export async function main(ns) {
  let cmd = ns.args.shift();
  let div;
  switch (cmd) {
    case "info":
      printInfo(ns);
      break;
    case "div":
    case "division":
      div = getDiv(ns, ns.args.shift());
      if (!div) { return }
      if (div) {
        printDiv(ns, div.name);
      } else {
        listDivs(ns);
      }
      break;
    case "office":
      div = getDiv(ns, ns.args.shift());
      if (!div) { return }
      let branch = branchName(ns, ns.args.shift());
      if (!branch) {
        listOffices(ns, div.name)
      } else {
        printOffice(ns, div.name, branch);
      }
      break;
    case "product":
    case "products":
      div = getDiv(ns, ns.args.shift());
      if (!div) { return }
      printProducts(ns, div.name);
      break;
  }

}

/**
 * @param {NS} ns
 * @param {String} name
 */
function branchName(ns, name) {
  if (!name) {
    ns.tprintf("Unknown city. Pick one of %s.", cities.join(", "));
    return false;
  }
  let found = cities.find(c => name[0].toLowerCase() == c[0].toLowerCase());
  if (!found) {
    ns.tprintf("Unknown city '%s'. Pick one of %s.", name, cities.join(", "));
    return false;
  }
  return found;
}

/**
 * @param {NS} ns
 * @param {String} name
 */
function getDiv(ns, name) {
  if (!name) {
    listDivs(ns);
    return false
  }

  let matches = ns.corporation.getCorporation().divisions.filter(
      d => d.name.toLowerCase().includes(name.toLowerCase()))
  if (matches.length == 0) {
    ns.tprint("Unknown division %s", name);
    return listDivs(ns);
  } else if (matches.length > 1) {
    ns.tprint("Possible matches: ", matches.join(", "));
    return;
  }

  return matches[0];
}

/**
 * @param {NS} ns
 * @param {String} div
 */
function printProducts(ns, div) {
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
      p.developmentProgress/100
    ])
  }
  ns.tprintf(fmt.table(data,
    ["name", ["demand", fmt.large], ["competition", fmt.large],
    ["prod$", fmt.money], "sale$", "inventory",
    ["dev %%", (n) => fmt.pct(n, 0, true)]]
  ));
}

/**
 * @param {NS} ns
 * @param {String} div
 */
function listOffices(ns, div) {
  let data = [];
  for(let city of ns.corporation.getDivision(div).cities) {
    let office = ns.corporation.getOffice(div, city);
    let warehouse = ns.corporation.getWarehouse(div, city);
    data.push([
      office.loc, `${office.employees.length}/${office.size}`,
      warehouse.sizeUsed/warehouse.size, warehouse.size, 
    ])
  }
  ns.tprintf(fmt.table(data,
    ["Location", "Employees",
      ["Warehouse util", (n) => fmt.pct(n, 0, true)], ["Warehouse size", fmt.large]],
  ));
}

/**
 * @param {NS} ns
 * @param {String} div
 * @param {String} branch
 */
function printOffice(ns, div, branch) {
  let office = ns.corporation.getOffice(div, branch);
  ns.tprintf("%s @ %s", div, branch);
  ns.tprintf("Employees: %d/%d", office.employees.length, office.size);
  ns.tprintf("Productivity:\n%s",
      Object.entries(office.employeeProd)
      .map(p => `  ${p[0]}: ${fmt.large(p[1]||0)}`).join("\n"));
}

/**
 * @param {NS} ns
 * @param {String} name
 */
function printDiv(ns, name) {
  let div = getDiv(ns, name);
  ns.tprintf("%s (%s)", div.name.toUpperCase(), div.type);
  ns.tprintf("Awareness: %s  Popularity: %s  Research: %s",
      fmt.large(div.awareness), fmt.large(div.popularity), fmt.large(div.research));
  ns.tprintf("Revenue: %s  Expenses: %s  Profit: %s/s",
      fmt.money(div.lastCycleRevenue), fmt.money(div.lastCycleExpenses),
      fmt.money(div.lastCycleRevenue-div.lastCycleExpenses));
  ns.tprintf("Production multiplier: %s", fmt.large(div.prodMult));
  ns.tprintf("Cities: %s", div.cities.join(", "));
  ns.tprintf("Products:");
  for (let p of div.products) {
    ns.tprintf("  %s", p);
  }
}

/**
 * @param {NS} ns
 */
function listDivs(ns) {
    let ds = ns.corporation.getCorporation().divisions;
    ns.tprintf("Divisions: %d", ds.length);
    for (let d of ds) {
      let profit = d.lastCycleRevenue-d.lastCycleExpenses;
      ns.tprintf("  %s: %s %s",
          d.name, d.type,
          fmt.money(profit),
      )
    }
}

/**
 * @param {NS} ns
 */
function printInfo(ns) {
    let i = ns.corporation.getCorporation();
    ns.tprintf(`funds: ${fmt.money(i.funds)}`);
    ns.tprintf(`revenue: ${fmt.money(i.revenue)}`);
    ns.tprintf(`expenses: ${fmt.money(i.expenses)}`);
    ns.tprintf(`profits: %s/s`,
        fmt.money(i.revenue - i.expenses),
    );
    ns.tprintf(`shares: ${fmt.int(i.totalShares, {digits:0})}`);
    ns.tprintf(`owned: ${fmt.int(i.numShares, {digits:0})}`);
    ns.tprintf(`issued: ${fmt.int(i.issuedShares, {digits:0})}`);
    if (i.shareSaleCooldown > 0) {
      ns.tprintf(`cooldown: ${fmt.time(i.shareSaleCooldown)}`);
    }
    ns.tprintf(`price: ${fmt.money(i.sharePrice)}`);
    let ds = i.divisions;
    ns.tprintf("Divisions: %d", ds.length);
    for (let d of ds) {
      let profit = d.lastCycleRevenue-d.lastCycleExpenses;
      ns.tprintf("  %s: %s %s",
          d.name, d.type,
          fmt.money(profit),
      )
    }
}
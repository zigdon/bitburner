import * as fmt from "/lib/fmt.js";
import {toast} from "/lib/log.js";
import {getPorts} from "/lib/ports.js";

const ports = getPorts();

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  let corp = ns.corporation.getCorporation();
  if (!corp) {
      toast(ns, "No corporation found, quitting.", {level: "warning"});
      return;
  }

  let lastPrice = 0;
  await ns.writePort(ports.UI, "create corp Corp");
  while (true) {
      // check product development
      let progress = await devProducts(ns);

      if (Date.now() - lastPrice > 20000) {
        // check product pricing
        await checkPrices(ns);
        lastPrice = Date.now();
      }
      await printSummary(ns, progress);
      // check commands
      // check warehouse util, upgrade?
      // buy gear?
      // increase office size?
      await ns.sleep(1000);
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
      `   Profits: ${fmt.money(corp.revenue-corp.expenses)}  Funds: ${fmt.money(corp.funds)}`);
    let data = [];
    for (let div of corp.divisions) {
      data.push([
        div.name,
        div.type,
        div.lastCycleRevenue-div.lastCycleExpenses,
        div.prodMult,
        div.popularity,
        div.awareness,
        progress[div.name] ? fmt.pct(progress[div.name]) : "N/A",
      ])
    }
    ns.print(fmt.table(data, [
      "division name", "type", ["profits", fmt.money],
      ["production", fmt.large], ["popularity", fmt.large], ["awareness", fmt.large],
      "Product Dev",
    ]))
    await ns.writePort(ports.UI, `update corp ${fmt.money(corp.revenue-corp.expenses)}/2`);
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
      // If these work, the rest doesn't matter
      let auto = false;
      if (ns.corporation.hasResearched(div.name, "MarketTA1")) {
        ns.corporation.setProductMarketTA1(div.name, name, true);
        auto = true;
      }
      if (ns.corporation.hasResearched(div.name, "MarketTA2")) {
        ns.corporation.setProductMarketTA2(div.name, name, true);
        auto = true;
      }
      if (auto) {
        continue;
      }
      if (p.sCost == 0) {
        // Set a default
        ns.corporation.sellProduct(div.name, "Aevum", name, "MAX", "MP*10", true);
        continue;
      }
      let stk = Object.values(p.cityData);
      let qty = Math.max(...stk.map(s => s[0].toFixed(2)));
      let deltas = stk.map(s => (s[1]-s[2]).toFixed(2));
      let min = Math.min(...deltas);
      let max = Math.max(...deltas);
      let m = Number(p.sCost.substr(3));
      ns.print(`Previous multiplier = ${m}`);
      if (min > 10 || qty > 1000) {  // price is too high
        m *= .8;
      } else if (max < -10 || qty < 10) {
        m *= 2;
      }
      m ||= 10;
      ns.print(`Setting price of ${name} to MP*${m}`);
      ns.corporation.sellProduct(div.name, "Aevum", name, "MAX", "MP*"+ m, true);
    }
  }
}

/** @param {NS} ns **/
async function devProducts(ns) {
  const products = {
    "Tobacco": {
      name: "Totally Safe Inc",
      products: [ "Total Lungs", "Total Heart", "Total Voice" ],
      gens: [ "", "II", "Delux", "Classic", "Ltd Ed", "2000", "Retro", "X-3000", "DLX" ],
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
    if (p < 100 && div.products.length == 3) {
      progress[div.name] = p/100;
      continue;
    }

    let budget = corp.funds / 100;
    if (budget < 1e9) {
      netLog(ns, "Not enough funds to create new products for %s", div.name);
      return progress;
    }

    let pName = getNextProduct(products[type], div.products);
    if (!pName) {
      return;
    }
    if (div.products.length == 3) {
      let dName = div.products.map(p => [p, ns.corporation.getProduct(div.name, p).sCost])
        .sort((a,b) => a[1] < b[1] ? -1 : 1)
        .map(p => p[0])[0];
      await toast(ns, "Discontinuing product for %s: %s", div.name, dName);
      ns.corporation.discontinueProduct(div.name, dName);
    }

    await toast(ns, "Creating new product for %s: %s", div.name, pName);
    ns.corporation.makeProduct(div.name, "Aevum", pName, budget, budget);
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
    let gen = c.substr(type.length+1).split("/")[0] || "";
    let tID = def.products.indexOf(type);
    let gID = def.gens.indexOf(gen);
    type = def.products[tID+1];
    if (!type) { 
      // next gen!
      type = def.products[0];
      gen = def.gens[gID+1];
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
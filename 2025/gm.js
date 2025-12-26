/// <reference path="../NetscriptDefinitions.d.ts" />

import { debug, info, critical } from "@/log.js"
import { loadCfg } from "@/lib/config.js"
import { singleInstance, parseNumber, parseTime } from "@/lib/util.js"

const config = "data/gm.json"
var cfg = {valid: false}

const cities = [
  "Sector-12",
  "Aevum",
  "Volhaven",
  "Chongqing",
  "New Tokyo",
  "Ishima",
]

var done = []
var lastRun = new Map()

/** @param {NS} ns */
export async function main(ns) {
  if (!singleInstance(ns)) { return }
  ns.disableLog("asleep")
  ns.disableLog("run")

  cfg = await loadCfg(ns, config, cfg)
  let loopDelay = cfg.loopDelay ?? 30000
  await info(ns, "Starting loop")
  let st = []
  while (true) {
    await ns.asleep(loopDelay)
    ns.printf("=== %s (%s)", Date().toString(), st.map((st) => st ?? "?").join(""))
    st = []
    cfg = await loadCfg(ns, config, cfg)

    if (cfg.disabled) {
      await debug(ns, "GM disabled")
      await ns.asleep(60000)
      continue
    }

    let n = 0
    for (let i=0; i< cfg.actions?.length; i++) {
      let a = cfg.actions[i]
      let cs = a.perCity ? cities : [cities[0]]
      let divs = a.perDiv ?
        ns.corporation.getCorporation().divisions :
        [ns.corporation.getCorporation().divisions[0]]
      for (let d of divs) {
        for (let c of cs) {
          n += 1

          if (done[n] && !a.repeat) { st[n]="v"; continue }
          let title = ns.sprintf("#%d(%s): %j", n, a.title ?? a.run ?? "N/A", a)
          if (a.disabled) {
            await info(ns, "Skipping disabled action %s", title)
            st[n]="d"
            continue
          }
          let ready = false
          for (let cond of a.triggers) {
            if (a.debug) {
              cond.debug = true
            }
            if (!await check(ns, n, cond, d, c)) {
              if (a.debug) {
                await info(ns, "%j is NOT ready", cond)
              }
              continue
            }
            ready = true
          }
          if (!ready) {
            st[n]="-"
            continue
          }
          await info(ns, "%s is ready", title)

          let script = ns.sprintf("lib/corp/%s.js", a.run)
          if (!ns.fileExists(script)) {
            st[n]="!"
            await critical(ns, "%s not found", script)
            continue
          }
          let args = a.args?.map((a) => a == "DIV" ? d : a == "CITY" ? c : a)
          st[n]="r"
          await run(ns, script, args ?? [], a.fork)

          done[n] = true
        }
      }
    }
  }
}

function isResearching(c, name) {
  let products = c.getDivision(name).products
  return products.map(
    (p) => c.getProduct(name, "Sector-12", p)
  ).some(
    (p) => p.developmentProgress < 100
  )
}

async function run(ns, script, args, fork) {
  ns.printf("Launching %s %j (fork=%j)", script, args, fork)
  let pid = ns.run(script, 1, ...args)
  if (!fork) {
    while (ns.isRunning(pid)) {
      await ns.asleep(100)
    }
  }
}

async function check(ns, n, cond, divName, city) {
  let c = ns.corporation
  let m = ns.getPlayer().money
  const print = async (tmpl, ...args) => cond?.debug ? await info(ns, tmpl, ...args) : ""
  await print("Checking %j (%s@%s)", cond, divName, city)

  if (cond.isPublic != undefined && c.getCorporation().public != cond.isPublic) {
    return false
  } else if (cond.isPublic != undefined) {
    await print("isPublic: %j pass", cond.isPublic)
  }
  if (cond.hasCorp != undefined && c.hasCorporation() != cond.hasCorp) {
    return false
  } else if (cond.hasCorp != undefined) {
    await print("hasCorp: %j pass", cond.hasCorp)
  }
  if (cond.player && parseNumber(cond.player) > m) {
    return false
  } else if (cond.player) {
    await print("player: %s < %s pass", ns.formatNumber(parseNumber(cond.player)), ns.formatNumber(m))
  }
  if (cond.dividends) {
    let cur = c.getCorporation().dividendRate * 100
    if (cond.dividends[0] == "<" && cur >= cond.dividends.slice(1)) {
      return false
    } else if (cond.dividends >= cur) {
      return false
    }
    await print("dividends: %j pass", cond.dividends)
  }
  if (cond.corp) {
    if (cond.corp[0] == "<" &&
      c.getCorporation().funds > parseNumber(cond.corp.slice(1))) {
      return false
    } else if (parseNumber(cond.corp) < c.getCorporation().funds) {
      return false
    }
    await print("corp: %j pass", cond.corp)
  }
  if (cond.canSellShares != undefined
    && cond.canSellShares != (c.getCorporation().shareSaleCooldown == 0)) {
    await print("canSellShares: %j blocked (cooldown=%j)",
      cond.canSellShares, c.getCorporation().shareSaleCooldown)
    return false
  } else if (cond.canSellShares != undefined) {
    await print("canSellShares: %j pass", cond.canSellShares)
  }
  if (cond.hasOutstandingShares != undefined
    && cond.hasOutstandingShares != (c.getCorporation().issuedShares > 0)) {
    await print("hasOutstandingShares: %j blocked (issued=%d)",
      cond.hasOutstandingShares, c.getCorporation().issuedShares)
    return false
  } else if (cond.hasOutstandingShares != undefined) {
    await print("hasOutstandingShares: %j pass", cond.hasOutstandingShares)
  }
  if (cond.canIssueShares != undefined &&
    c.getCorporation().issueNewSharesCooldown > 0) {
    return false
  } else if (cond.canIssueShares != undefined) {
    await print("canIssueShares: %j pass", cond.canIssueShares)
  }
  if (cond.sharePrice) {
    if (cond.sharePrice[0] == "<" && 
      c.getCorporation().sharePrice >= cond.sharePrice.slice(1)) {
      await print("sharePrice: %j fail (price=%d)",
        cond.sharePrice, c.getCorporation().sharePrice)
      return false
    }
    if (c.getCorporation().sharePrice < cond.sharePrice) {
      await print("sharePrice: %j fail (price=%d)",
        cond.sharePrice, c.getCorporation().sharePrice)
      return false
    }
    await print("sharePrice: %j pass", cond.sharePrice)
  }
  if (cond.needUnlock && c.hasUnlock(cond.needUnlock)) {
    return false
  } else if (cond.needUnlock) {
    await print("needUnlock: %j pass", cond.needUnlock)
  }
  if (cond.hasUnlock && !c.hasUnlock(cond.hasUnlock)) {
    return false
  } else if (cond.hasUnlock) {
    await print("hasUnlock: %j pass", cond.hasUnlock)
  }
  if (cond.hasDiv && !c.getCorporation().divisions.includes(cond.hasDiv)) {
    await print("hasDiv: %j blocked", cond.hasDiv)
    return false 
  } else if (cond.hasDiv) {
    await print("hasDiv: %j pass", cond.hasDiv)
  }
  if (cond.needDiv && c.getCorporation().divisions.includes(cond.needDiv)) {
    await print("needDiv: %j blocked", cond.needDiv)
    return false 
  } else if (cond.needDiv) {
    await print("needDiv: %j pass", cond.needDiv)
  }
  if (cond.every && lastRun.has(n) &&
      now-lastRun.get(n) < parseTime(cond.every)) {
      return false 
  } else if (cond.every) {
    await print("every: %j pass", cond.every)
  }
  if (cond.noRND && (!c.getCorporation().divisions.includes(cond.noRND) || isResearching(c, cond.noRND))) {
    return false
  } else if (cond.noRND) {
    await print("noRND: %j pass", cond.noRND)
  }
  if (cond.income && c.getCorporation().revenue < cond.income) {
    return false
  } else if (cond.income) {
    await print("income: %j pass", cond.income)
  }
  if (cond.ratio && !ratio(ns, cond, divName, city)) {
    return false
  } else if (cond.ratio) {
    await print("ratio: %j pass", cond.cost)
  }
  if (cond.canResearch &&
    (c.getDivision(divName).researchPoints <
      c.getResearchCost(divName, cond.canResearch) ||
      c.hasResearched(divName, cond.canResearch))
  ) {
    return false
  } else if (cond.canResearch) {
    ns.printf("research: %s %s pass", divName, cond.canResearch)
  }
  ns.printf("%j -> pass", cond)

  return true
}

// Returns true if the ratio of funds to cost is high enough
function ratio(ns, cond, div, city) {
  let c = ns.corporation
  let funds = ns.corporation.getCorporation().funds
  let ratio = parseNumber(cond.ratio)
  let costType = cond.cost
  let cost = 0
  switch (costType) {
    case "ad":
      cost = c.getHireAdVertCost(div)
      break
    case "office":
      if (!c.getDivision(div).cities.includes(city)) {
        return false
      }
      cost = c.getOfficeSizeUpgradeCost(div, city, 5)
      break
    case "warehouse":
      if (!c.getDivision(div).cities.includes(city)) {
        return false
      }
      if (!c.hasWarehouse(div, city)) {
        return false
      }
      cost = c.getUpgradeWarehouseCost(div, city)
      break
    case "upgrade":
      cost = c.getUpgradeLevelCost(cond.upgradeName)
      break
  }

  if (cond.debug) {
    ns.printf("ratio %s: %d*%d < %d", costType, cost, ratio, funds)
    ns.printf("    ==>   %d < %d", cost*ratio, funds)
    ns.printf("    ==>   %s < %s", ns.formatNumber(cost*ratio), ns.formatNumber(funds))
  }

  return cost * ratio < funds
}

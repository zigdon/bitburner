/// <reference path="../NetscriptDefinitions.d.ts" />

import { nsRPC } from "@/lib/nsRPC.js"
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

/** @param {NS} ons */
export async function main(ons) {
  ons.ramOverride(3.5)
  if (!singleInstance(ons)) { return }
  ons.disableLog("asleep")
  ons.disableLog("run")
  /** @type {NS} */
  let ns = new nsRPC(ons)

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
      let corp = await ns.corporation.getCorporation()
      let a = cfg.actions[i]
      let cs = a.perCity ? cities : [cities[0]]
      let divs = a.perDiv ?  corp.divisions : [corp.divisions[0]]
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
          ns.printf("Running %s %j", script, args)
          await run(ns, script, args ?? [], a.fork)

          done[n] = true
        }
      }
    }
  }
}

async function isResearching(c, name) {
  let div = await c.getDivision(name)
  let products = div.products
  return await products.map(
    async (p) => await c.getProduct(name, "Sector-12", p)
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
  let corp = await ns.corporation.getCorporation()
  let div = divName ? await ns.corporation.getDivision(divName) : null
  let m = ns.getPlayer().money
  const print = async (tmpl, ...args) => cond?.debug ? await info(ns, tmpl, ...args) : ""
  await print("Checking %j (%s@%s)", cond, divName, city)

  if (cond.isPublic != undefined && corp.public != cond.isPublic) {
    return false
  } else if (cond.isPublic != undefined) {
    await print("isPublic: %j pass", cond.isPublic)
  }
  if (cond.hasCorp != undefined && await c.hasCorporation() != cond.hasCorp) {
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
    let cur = corp.dividendRate * 100
    if (cond.dividends[0] == "<" && cur >= cond.dividends.slice(1)) {
      return false
    } else if (cond.dividends >= cur) {
      return false
    }
    await print("dividends: %j pass", cond.dividends)
  }
  if (cond.corp) {
    if (cond.corp[0] == "<" &&
      corp.funds > parseNumber(cond.corp.slice(1))) {
      return false
    } else if (corp.funds < parseNumber(cond.corp)) {
      return false
    }
    await print("corp: %j pass", cond.corp)
  }
  if (cond.canSellShares != undefined
    && cond.canSellShares != (corp.shareSaleCooldown == 0)) {
    await print("canSellShares: %j blocked (cooldown=%j)",
      cond.canSellShares, corp.shareSaleCooldown)
    return false
  } else if (cond.canSellShares != undefined) {
    await print("canSellShares: %j pass", cond.canSellShares)
  }
  if (cond.hasOutstandingShares != undefined
    && cond.hasOutstandingShares != (corp.issuedShares > 0)) {
    await print("hasOutstandingShares: %j blocked (issued=%d)",
      cond.hasOutstandingShares, corp.issuedShares)
    return false
  } else if (cond.hasOutstandingShares != undefined) {
    await print("hasOutstandingShares: %j pass", cond.hasOutstandingShares)
  }
  if (cond.canIssueShares != undefined &&
    corp.issueNewSharesCooldown > 0) {
    return false
  } else if (cond.canIssueShares != undefined) {
    await print("canIssueShares: %j pass", cond.canIssueShares)
  }
  if (cond.sharePrice) {
    if (cond.sharePrice[0] == "<" && 
      corp.sharePrice >= parseNumber(cond.sharePrice.slice(1))) {
      await print("sharePrice: %j fail (price=%d)",
        cond.sharePrice, corp.sharePrice)
      return false
    }
    if (corp.sharePrice < parseNumber(cond.sharePrice)) {
      await print("sharePrice: %j fail (price=%d)",
        cond.sharePrice, corp.sharePrice)
      return false
    }
    await print("sharePrice: %j pass", cond.sharePrice)
  }
  if (cond.needUnlock && await c.hasUnlock(cond.needUnlock)) {
    return false
  } else if (cond.needUnlock) {
    await print("needUnlock: %j pass", cond.needUnlock)
  }
  if (cond.hasUnlock && !await c.hasUnlock(cond.hasUnlock)) {
    return false
  } else if (cond.hasUnlock) {
    await print("hasUnlock: %j pass", cond.hasUnlock)
  }
  if (cond.hasDiv && !corp.divisions.includes(cond.hasDiv)) {
    await print("hasDiv: %j blocked", cond.hasDiv)
    return false 
  } else if (cond.hasDiv) {
    await print("hasDiv: %j pass", cond.hasDiv)
  }
  if (cond.needDiv && corp.divisions.includes(cond.needDiv)) {
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
  if (cond.noRND && (!corp.divisions.includes(cond.noRND) || await isResearching(c, cond.noRND))) {
    return false
  } else if (cond.noRND) {
    await print("noRND: %j pass", cond.noRND)
  }
  if (cond.income && corp.revenue < parseNumber(cond.income)) {
    return false
  } else if (cond.income) {
    await print("income: %j pass", cond.income)
  }
  if (cond.ratio && !await ratio(ns, cond, divName, city)) {
    return false
  } else if (cond.ratio) {
    await print("ratio: %j pass", cond.cost)
  }
  if (cond.canResearch &&
    (!divName || (div.researchPoints <
      await c.getResearchCost(divName, cond.canResearch) ||
      await c.hasResearched(divName, cond.canResearch)))
  ) {
    return false
  } else if (cond.canResearch) {
    ns.printf("research: %s %s pass", divName, cond.canResearch)
  }
  ns.printf("%j -> pass", cond)

  return true
}

// Returns true if the ratio of funds to cost is high enough
async function ratio(ns, cond, divName, city) {
  if (!divName) return
  let c = ns.corporation
  let div = await c.getDivision(divName)
  let funds = ns.corporation.getCorporation().funds
  let ratio = parseNumber(cond.ratio)
  let costType = cond.cost
  let cost = 0
  switch (costType) {
    case "ad":
      cost = await c.getHireAdVertCost(divName)
      break
    case "office":
      if (!div.cities.includes(city)) {
        return false
      }
      cost = await c.getOfficeSizeUpgradeCost(divName, city, 5)
      break
    case "warehouse":
      if (!div.cities.includes(city)) {
        return false
      }
      if (!await c.hasWarehouse(divName, city)) {
        return false
      }
      cost = await c.getUpgradeWarehouseCost(divName, city)
      break
    case "upgrade":
      cost = await c.getUpgradeLevelCost(cond.upgradeName)
      break
  }

  if (cond.debug) {
    ns.printf("ratio %s: %d*%d < %d", costType, cost, ratio, funds)
    ns.printf("    ==>   %d < %d", cost*ratio, funds)
    ns.printf("    ==>   %s < %s", ns.formatNumber(cost*ratio), ns.formatNumber(funds))
  }

  return cost * ratio < funds
}

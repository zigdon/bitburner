import { debug, info, toast, critical } from "@/log.js"
import { loadCfg } from "@/lib/config.js"
import { singleInstance, parseNumber } from "@/lib/util.js"
import { bbActionTypes, bbActionNames } from "@/lib/constants.js"

const config = "data/bm.json"
var cfg = {valid: false}

/** @param {NS} ns */
export async function main(ns) {
  if (!ns.bladeburner.inBladeburner()) {
    await critical(ns, "Not in bladeburner.")
    return
  }
  if (!singleInstance(ns)) return
  [
    "asleep",
    "bladeburner.upgradeSkill",
  ].forEach((f) => ns.disableLog(f))
    
  let b = ns.bladeburner
  let loopDelay = cfg.loopDelay ?? 30000
  let cfgTime = 0
  await info(ns, "Starting blademaster loop")
  while (true) {
    await b.nextUpdate()

    if (Date.now() - cfgTime > loopDelay) {
      ns.printf("=== %s", Date().toString())
      cfg = await loadCfg(ns, config, cfg)
      cfgTime = Date.now()
    }

    if (cfg.disabled) {
      await debug(ns, "BM disabled")
      await ns.asleep(60000)
      continue
    }

    await bbSkills(ns)

    for (let a of cfg.actions) {
      let res = a.cond ? check(ns, a) : [true, null]
      if (res[0]) {
        await bbDo(ns, a, res[1])
        break
      }
    }
  }
}

const skillPri = [
  "Blade's Intuition",
  "Digital Observer",
  "Reaper",
  "Evasive System",
  "Cloak@25",
  "Short-Circuit@25",
  "Tracer@10",
  "Overclock",
  "Hyperdrive@20",
]

async function bbSkills(ns) {
  await ns.asleep(1)
  let b = ns.bladeburner
  let skills = [...skillPri]
  let upgrades = new Map()
  let spent = 0
  while (skills.length > 0) {
    let s = skills[0]
    let cap = 0
    if (s.includes("@")) {
      [s, cap] = s.split("@")
    }
    let cost = b.getSkillUpgradeCost(s)
    if (((cap == 0) || (b.getSkillLevel(s) <= cap)) && cost <= b.getSkillPoints()) {
      if (!upgrades.has(s)) upgrades.set(s, 0)
      upgrades.set(s, upgrades.get(s)+1)
      if (!b.upgradeSkill(s)) {
        ns.printf("Failed to upgrade %s", s)
        break
      }
      spent += cost
    } else {
      skills.shift()
    }
  }
  if (spent >0) {
    ns.printf("Upgraded skills for %d points:", spent)
    for (let s of Array.from(upgrades.keys()).sort()) {
      ns.printf("  %s: %d levels", s, upgrades.get(s))
    }
  }
}

async function bbDo(ns, a, match) {
  let b = ns.bladeburner
  const start = async (t, n) => {
    let cur = b.getCurrentAction()
    if (cur?.type == t && cur?.name == n) return
    if (a.msg) await info(ns, "BM: %s", a.msg)
    if (a.toast) await toast(ns, "BM: %s", a.toast)
    if (b.startAction(t, n)) {
      await info(ns, "BM: Starting %s.%s", t, n)
    } else {
      await info(ns, "BM: Failed to start %s.%s", t, n)
    }
  }

  switch (a.do) {
    case "travel": {
      // Go to the next city.
      let cities = Object.values(ns.enums.CityName)
      let dest = cities[
        (cities.indexOf(b.getCity())+1) % cities.length
      ]
      if (b.switchCity(dest)) {
        await info(ns, "BM: Travelling to %s", dest)
      } else {
        await info(ns, "BM: Failed to travel to %s", dest)
      }
      break
    }
    case "blackops": 
    case "contracts":
    case "operations": {
      let [type, name] = match.split(".")
      await start(type, name)
      break
    }
    default: {
      for (let t of bbActionTypes) {
        for (let n of bbActionNames(ns, t)) {
          if (n.toLowerCase().includes(a.do.toLowerCase())) {
            await start(t, n)
            return
          }
        }
      }
      await critical(ns, "BM: Unknown action %j", a.do)
    }
  }
}

/**
 * @param {NS} ns
 * @param {Action} act
 */
function check(ns, act) {
  let b = ns.bladeburner
  let cond = act.cond
  let pass = true
  let match = null

  // ns.printf("\nstarting check(%j)...", act)

  const cmpV = (c, v) => {
    if (c == undefined) return
    if (v == undefined) return
    let dir = c[0]
    c = parseNumber(c.slice(1))
    if (dir == ">") {
      pass &&= c <= v
      // ns.printf("cmpv(%j, %j) -> %j", c, v, c<=v)
    } else {
      pass &&= c > v
      // ns.printf("cmpv(%j, %j) -> %j", c, v, c>v)
    }
  }

  const cmpB = (a, b) => {
    if (a == undefined) return
    if (b == undefined) return
    pass &&= a == b
    // ns.printf("cmpb(%j, %j) -> %j", a, b, a==b)
  }

  const action = async (a) => {
    if (a == undefined) return undefined
    let res = ""
    for (let t of bbActionTypes) {
      for (let n of bbActionNames(ns, t)) {
        if (n.toLowerCase().includes(a.toLowerCase())) {
          if (res == "") {
            res = ns.sprintf("%s.%s", t, n)
          } else {
            await critical(ns, "Multiple actions matching %j in bm config: %j", 
              a, [res, n.toLowerCase().includes(a.toLowerCase())])
            return null
          }
        }
      }
    }

    // ns.printf("action(%j) -> %j", a, res)
    return res
  }

  const checkChance = (c, type) => {
    if (c == undefined) return
    if (type == undefined) return
    // ns.printf("checking chance: %j, %j", c, type)
    type = bbActionTypes.filter((t) => t.toLowerCase() == type?.toLowerCase())[0]
    // ns.printf("-> checking chance: %j, %j", c, type)
    let dir = c[0] == ">" ? 1 : -1
    let chance = c.slice(1)
    if (type == undefined) return
    for (let a of bbActionNames(ns, type).reverse()) {
      if (b.getActionCountRemaining(type, a) == 0) continue
      if (type == "Black Operations")
        if (a != b.getNextBlackOp()?.name || b.getBlackOpRank(a) > b.getRank()) continue
      let est = b.getActionEstimatedSuccessChance(type, a)
      // ns.printf("... %s -> %j", a, est)
      if (dir * chance < dir * est[0]*100) {
        pass &&= true
        return ns.sprintf("%s.%s", type, a)
      }
    }
    pass = false
  }

  let stam = b.getStamina()
  cmpV(cond.stamina, 100*stam[0]/stam[1])
  let curAct = b.getCurrentAction()
  if (cond.cur) cmpB(action(cond.cur), curAct?.type+"."+curAct?.name)

  let city = cond.city
  if (city == "current") city = b.getCity()
  if (city) cmpV(cond.chaos, b.getCityChaos(city))
  cmpV(cond.pop, b.getCityEstimatedPopulation(b.getCity()))
  cmpV(cond.communities, b.getCityCommunities(b.getCity()))
  match = checkChance(cond.chance, cond.type)
  if (cond.has != undefined) checkChance(">0", cond.has)

  return [pass, match]
}

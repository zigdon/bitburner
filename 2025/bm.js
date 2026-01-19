import { nsRPC } from "@/lib/nsRPC.js"
import { debug, info, toast, critical } from "@/log.js"
import { loadCfg } from "@/lib/config.js"
import { singleInstance, parseNumber } from "@/lib/util.js"
import { bbActionTypes, bbActionNames, gyms } from "@/lib/constants.js"

const config = "data/bm.json"
var cfg = {valid: false}

/** @param {NS} ons */
export async function main(ons) {
  ons.ramOverride(6.9)
  /** @param {NS} ns */
  let ns = new nsRPC(ons)
  if (!await ns.bladeburner.inBladeburner()) {
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
    
    /** @type BBState */
    let state = {
      stam: await b.getStamina(),
      blops: await b.getNextBlackOp(),
      rank: await b.getRank(),
      curAct: await b.getCurrentAction(),
      city: await b.getCity(),
    }

    for (let a of cfg.actions) {
      let res = a.cond ? await check(ns, state, a) : [true, null]
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
    let cost = await b.getSkillUpgradeCost(s)
    if (((cap == 0) ||
      (await b.getSkillLevel(s) <= cap)) && cost <= await b.getSkillPoints()) {
      if (!upgrades.has(s)) upgrades.set(s, 0)
      upgrades.set(s, upgrades.get(s)+1)
      if (!await b.upgradeSkill(s)) {
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
    let cur = await b.getCurrentAction()
    if (cur?.type == t && cur?.name == n) return
    if (a.msg) await info(ns, "BM: %s", a.msg)
    if (a.toast) await toast(ns, "BM: %s", a.toast)
    if (await b.startAction(t, n)) {
      await info(ns, "BM: Starting %s.%s", t, n)
    } else {
      await info(ns, "BM: Failed to start %s.%s", t, n)
    }
  }

  let atGym = ""
  const doGym = async () => {
    let cur = ns.getPlayer().city
    if (!gyms.has(cur)) {
      await info(ns, "BM: No gym at %s, going home", cur)
      await ns.singularity.travelToCity("Sector-12")
    }

    let skill = Object.entries(ns.getPlayer().skills).filter(
      (s) => ["strength", "defense", "dexterity", "agility"].includes(s[0])
    ).sort(
      (a,b) => a[1] - b[1]
    )[0][0]
    if (skill != atGym) {
      atGym = skill
      await info(ns, "BM: Training %s", skill)
      await ns.singularity.gymWorkout(gyms.get(cur), skill, false)
    }
  }

  if (await ns.singularity.isBusy() && atGym=="") {
    await toast(ns, "Bladeburner waiting 1m for current action to finish")
    await ns.asleep(60000)
    return
  }

  atGym = ""
  switch (a.do) {
    case "travel": {
      // Go to the next city.
      let cities = Object.values(ns.enums.CityName)
      let dest = cities[
        (cities.indexOf(await b.getCity())+1) % cities.length
      ]
      if (await b.switchCity(dest)) {
        await info(ns, "BM: Travelling to %s", dest)
      } else {
        await info(ns, "BM: Failed to travel to %s", dest)
      }
      break
    }
    case "gym": {
      await doGym()
      break
    }
    case "blackops": 
      let remaining = b.getBlackOpNames().filter(
        (op) => await b.getActionCountRemaining("Black Operations", op) >= 1
      ).length
      if (remaining > 0) await toast(ns, "BM: %d blops remains", remaining-1)
        else ns.toast("Last blops started!", "success", null)
    case "contracts":
    case "operations": {
      let [type, name] = match.split(".")
      await start(type, name)
      break
    }
    default: {
      for (let t of bbActionTypes) {
        for (let n of await bbActionNames(ns, t)) {
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
 * @param {BBState} state
 * @param {Action} act
 */
async function check(ns, state, act) {
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
      // ns.printf("cmpv(%j, %j) -> %j (%j)", c, v, c<=v, pass)
    } else {
      pass &&= c > v
      // ns.printf("cmpv(%j, %j) -> %j (%j)", c, v, c>v, pass)
    }
  }

  const cmpB = (a, b) => {
    if (a == undefined) return
    if (b == undefined) return
    pass &&= a == b
    // ns.printf("cmpb(%j, %j) -> %j (%j)", a, b, a==b, pass)
  }

  const action = async (a) => {
    if (a == undefined) return undefined
    let res = ""
    for (let t of bbActionTypes) {
      for (let n of await bbActionNames(ns, t)) {
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

  const checkChance = async (c, type) => {
    if (c == undefined) return
    if (type == undefined) return
    type = bbActionTypes.filter((t) => t.toLowerCase() == type?.toLowerCase())[0]
    let dir = c[0] == ">" ? 1 : -1
    let chance = c.slice(1)
    if (type == undefined) return
    let acts = []
    if (type == "Black Operations") {
      if (!state.blops || state.blops.rank > state.rank) {
        pass = false
        return
      }
      acts = [state.blops.name]
    } else {
      acts = await bbActionNames(ns, type)
    }
    for (let a of acts.reverse()) {
      if (await b.getActionCountRemaining(type, a) < 1) continue
      let est = await b.getActionEstimatedSuccessChance(type, a)
      if (dir * chance < dir * est[0]*100) {
        pass &&= true
        return ns.sprintf("%s.%s", type, a)
      }
    }
    pass = false
  }

  let stam = state.stam
  cmpV(cond.stamina, 100*stam[0]/stam[1])
  let curAct = state.curAct
  if (cond.cur) cmpB(await action(cond.cur), curAct?.type+"."+curAct?.name)

  let city = cond.city
  let curCity = state.city
  if (city == "current") city = curCity
  if (city) cmpV(cond.chaos, await b.getCityChaos(city))
  cmpV(cond.pop, await b.getCityEstimatedPopulation(curCity))
  cmpV(cond.communities, await b.getCityCommunities(curCity))
  match = await checkChance(cond.chance, cond.type)
  if (cond.has != undefined) checkChance(">0", cond.has)

  ns.printf("Check %j returning [%j, %j]", act, pass, match)
  return [pass, match]
}

import { debug, info, critical } from "@/log.js"
import { loadCfg } from "@/lib/config.js"
import { singleInstance, parseNumber } from "@/lib/util.js"
import { bbActionTypes, bbActionNames } from "@/lib/constants.js"

const config = "data/bm.json"
var cfg = {valid: false, actions: [{"do": "gym"}]}

/** @param {NS} ns */
export async function main(ns) {
  if (!ns.bladeburner.inBladeburner()) {
    await critical(ns, "Not in bladeburner.")
    return
  }
  if (!singleInstance(ns)) return
  [
    "asleep",
  ].forEach((f) => ns.disableLog(f))
    
  let loopDelay = cfg.loopDelay ?? 10000
  await info(ns, "Starting blademaster loop")
  while (true) {
    await ns.asleep(loopDelay)
    ns.printf("=== %s", Date().toString())
    cfg = await loadCfg(ns, config, cfg)
    ns.printf("okay, now what")

    if (cfg.disabled) {
      await debug(ns, "BM disabled")
      await ns.asleep(60000)
      continue
    }

    for (let a of cfg.actions) {
      let res = a.cond ? check(ns, a) : [true, null]
      ns.printf("check(%j) -> %j", a, res)
      if (res[0]) {
        bbDo(ns, a, res[1])
        break
      }
    }
  }
}

function bbDo(ns, a, match) {
  ns.tprintf("do: %j %j", a, match)
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

  const cmpV = (c, v) => {
    if (c == undefined) return
    if (v == undefined) return
    let dir = c[0]
    c = parseNumber(c.slice(1))
    if (dir == ">") {
      pass &&= c >= v
      ns.printf("cmpv(%j, %j) -> %j", c, v, c>=v)
    } else {
      pass &&= c < v
      ns.printf("cmpv(%j, %j) -> %j", c, v, c<v)
    }
  }

  const cmpB = (a, b) => {
    if (a == undefined) return
    if (b == undefined) return
    pass &&= a == b
    ns.printf("cmpb(%j, %j) -> %j", a, b, a==b)
  }

  const action = async (a) => {
    if (a == undefined) return null
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

    ns.printf("action(%j) -> %j", a, res)
    return res
  }

  const checkChance = (c, type) => {
    if (c == undefined) return
    if (type == undefined) return
    ns.printf("checking chance: %j, %j", c, type)
    type = bbActionTypes.filter((t) => t.toLowerCase() == type?.toLowerCase())[0]
    let dir = c[0] == ">" ? 1 : -1
    let chance = c.slice(1)
    if (type == undefined) return
    for (let a of bbActionNames(ns, type).reverse()) {
      let est = b.getActionEstimatedSuccessChance(type, a)
      if (dir * chance > dir * est*100) {
        pass &&= true
        return ns.sprintf("%s.%s", type, a)
      }
    }
    pass = false
  }

  let stam = b.getStamina()
  cmpV(cond.stamina, 100*stam[0]/stam[1])
  let curAct = b.getCurrentAction()
  cmpB(action(cond.cur), curAct.type+"."+curAct.name)

  let player = ns.getPlayer()
  let city = cond.city
  if (city == "current") city = player.city
  if (city) cmpV(cond.chaos, b.getCityChaos(city))
  cmpV(cond.pop, b.getCityEstimatedPopulation(player.city))
  cmpV(cond.communities, b.getCityCommunities(player.city))
  match = checkChance(cond.chance, cond.type)

  return [pass, match]
}

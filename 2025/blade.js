import {table} from "@/table.js"
import {bbActionTypes} from "@/lib/constants.js"

/** @type Map<string, func(ns, args)>*/
let cmds = new Map([
  ["status", bbStatus],
  ["tasks", bbTasks],
  ["do", bbDo],
  ["skills", bbSkills],
  ["cities", bbCities],
])

/** @param {NS} ns */
export async function main(ns) {
  if (!ns.bladeburner.inBladeburner()) {
    ns.tprint("Not in bladeburner.")
    return
  }

  if (cmds.has(ns.args[0])) {
    cmds.get(ns.args[0])(ns, ns.args.slice(1))
  } else {
    ns.tprintf(
      "Unknown command %j. Pick one of %j",
      ns.args[0], Array.from(cmds.keys()).sort().join(", "))
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

function bbSkills(ns, args) {
  let b = ns.bladeburner
  if (args.length > 0) {
    let skills = b.getSkillNames()
    if (args[0] == "all") {
      skills = [...skillPri]
    } else {
      skills = skills.filter(
        (s) => s.toLowerCase().includes(args.join(" ").toLowerCase())
      )
    }
    ns.printf("skills = %j", skills)
    if (skills.length == 1) {
      if (b.upgradeSkill(skills[0])) {
        ns.tprintf("Upgraded %s to %d", skills[0], b.getSkillLevel(skills[0]))
      } else {
        ns.tprintf("Failed to upgrade %s", skills[0])
      }
      return
    }

    while (skills.length > 0) {
      let s = skills[0]
      let cap = 0
      if (s.includes("@")) {
        [s, cap] = s.split("@")
      }
      if (((cap == 0) || (b.getSkillLevel(s) <= cap)) &&
        b.getSkillUpgradeCost(s) <= b.getSkillPoints()) {
        ns.tprintf("Upgrading %s for %d/%d",
          s, b.getSkillUpgradeCost(s), b.getSkillPoints())
        if (!b.upgradeSkill(s)) {
          ns.tprintf("Failed to upgrade")
          break
        }
      } else {
        skills.shift()
      }
    }
    return
  }
  let data = []
  for (let s of b.getSkillNames()) {
    data.push([
      s,
      b.getSkillLevel(s),
      b.getSkillUpgradeCost(s),
    ])
  }
  ns.tprintf("Skill points: %d", b.getSkillPoints())
  ns.tprintf(table(ns, ["Name", "Level", "Upgrade Cost"], data))
}

function bbDo(ns, args) {
  let b = ns.bladeburner
  let acts = new Map()
  let types = getTypes(ns)
  for (let s of bbActionTypes) {
    for (let a of types[s]) {
      acts.set(a.toLowerCase(), [s, a])
    }
  }
  let sel = Array.from(acts.keys()).filter((k) => k == args.join(" "))
  if (sel.length == 0) 
    sel = Array.from(acts.keys()).filter((k) => k.includes(args.join(" ")))
  if (sel.length == 0) {
    ns.tprintf("No matching action for %j", args)
    return
  } else if (sel.length > 1) {
    ns.tprintf("Matching actions:")
    bbTasks(ns, undefined, sel.map((s) => acts.get(s)))
    return
  }

  let a = acts.get(sel[0])
  ns.tprintf("Starting %s > %s", a[0], a[1])
  b.startAction(a[0], a[1])
}

function getTypes(ns) {
  let b = ns.bladeburner
  return {
    General: b.getGeneralActionNames(),
    Contracts: b.getContractNames(),
    Operations: b.getOperationNames(),
    "Black Operations": b.getBlackOpNames(),
  }
}

function bbTasks(ns, sect, subset) {
  let b = ns.bladeburner
  let all = new Map()
  let types = getTypes(ns)
  let sections = bbActionTypes
  if (sect) {
    sections = bbActionTypes.filter((s) => s.toLowerCase().indexOf(sect) == 0)
  }
  const getLine = (sect, act) => [
    act,
    ns.tFormat(b.getActionTime(sect, act)),
    ns.formatNumber(b.getActionCountRemaining(sect, act), 0),
    ns.sprintf("%d%%-%d%%", ...b.getActionEstimatedSuccessChance(sect, act).map(
        (esc) => Math.floor(esc*100)
      )),
    ns.formatNumber(b.getActionRepGain(sect, act)),
  ]
  if (subset) {
    ns.tprintf(table(ns,
      ["Name", "Time", "Available", "Est. Chance", "Rep"],
      subset.map((s) => getLine(s[0], s[1])))
    )
    return
  }

  for (let t of sections) {
    let data = []
    for (let a of types[t]) {
      data.push(getLine(t, a))
    }
    all.set(t, data)
  }

  for (let t of sections) {
    ns.tprintf("\n%s", t.toUpperCase())
    ns.tprintf(table(ns, ["Name", "Time", "Available", "Est. Chance", "Rep"], all.get(t)))
  }
}

function bbStatus(ns, args) {
  let b = ns.bladeburner
  let pl = ns.getPlayer()
  let st = b.getStamina()
  let act = b.getCurrentAction()
  let data = [
    ["HP", ns.sprintf("%d/%d", pl.hp.current, pl.hp.max)],
    ["Stamina", ns.sprintf("%d/%d", st[0], st[1])],
    ["Penalty", ns.sprintf("%.2f%%", Math.max(100-100*st[0]/st[1]/0.5, 0))],
    ["Skill points", b.getSkillPoints()],
    ["Team size", b.getTeamSize()],
    ["Activity", act ?
      ns.sprintf("%s/%s (%d remaining)",
        act.type, act.name, b.getActionCountRemaining(act.type, act.name))
    : "N/A"],
  ]

  ns.tprintf(table(ns, ["Player stats", ""], data))
}

function bbCities(ns, args) {
  let data = []
  let b = ns.bladeburner
  for (let c of Object.values(ns.enums.CityName)) {
    data.push([
      c,
      ns.formatNumber(b.getCityEstimatedPopulation(c)),
      b.getCityCommunities(c),
      ns.sprintf("%.2f", b.getCityChaos(c)),
    ])
  }

  ns.tprintf(table(ns, ["Name", "Pop", "Communities", "Chaos"], data))
}

export function autocomplete(data, args) {
  return Array.from(cmds.keys());
}


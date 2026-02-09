import {table} from "@/table.js"
/** @param {NS} ns */
export async function main(ns) {
  let cmd = ns.args[0]
  let cmds = new Map([
    ["info", gangInfo],
    ["recruit", recruit],
    ["tasks", tasks],
  ])
  if (!ns.gang.inGang()) {
    ns.tprintf("Not in a gang")
    return
  }

  if (cmd == undefined) cmd = "info"
  if (cmds.has(cmd)) {
    await cmds.get(cmd)(ns)
  } else {
    ns.tprintf("Unknown command %s", cmd)
    ns.tprintf("Pick one of: %s", Array.from(cmds.keys()).sort())
  }
}

/** @param {NS} ns */
async function tasks(ns) {
  let g = ns.gang
  let names = g.getTaskNames()
  let data = []
  for (let t of names) {
    let s = g.getTaskStats(t)
    const w = (st) => s[st+"Weight"] > 0
      ? ns.sprintf("%s:%d", st, s[st+"Weight"])
      : null
    if (!s.isCombat) continue
    let ter = s.territory
    data.push([
      t,
      s.baseRespect,
      s.baseWanted,
      s.baseMoney,
      [
        "str", "def", "dex", "agi", "cha"
      ].map((st) => w(st)).filter((st) => st).join(", "),
      s.difficulty,
      ns.sprintf("%.2f/%.2f/%.2f",
        ter.money,
        ter.respect,
        ter.wanted)
    ])
  }

  ns.tprintf(table(ns,
    ["Task", "Respect", "Wanted", "Money", "Weights", "Difficulty",
      "Territory (mon/resp/want)"],
    data))
}

/** @param {NS} ns */
async function gangInfo(ns) {
  let g = ns.gang
  let gi = g.getGangInformation()
  let data = [
    [ "Money", "$"+ns.formatNumber(gi.moneyGainRate)+"/s"],
    [ "Power", ns.formatNumber(gi.power)],
    [ "Respect", ns.sprintf("%s (%s/s)", ns.formatNumber(gi.respect), ns.formatNumber(gi.respectGainRate))],
    [ "Next recruit", gi.canRecruitMember ? "NOW" : ns.formatNumber(gi.respectForNextRecruit)],
    [ "Territory", ns.sprintf("%.2f%%", gi.territory * 100)],
    [ "Territory Clash", ns.sprintf("%.2f%%", gi.territoryClashChance * 100)],
    [ "Wanted", ns.sprintf("%s (%s/s)", ns.formatNumber(gi.wantedLevel), ns.formatNumber(gi.wantedLevelGainRate))],
    [ "Wanted penalty", gi.wantedPenalty],
  ]

  ns.tprintf(table(ns, [gi.faction.toUpperCase(), gi.isHacking ? "Do hacks" : "Do crime" ], data))

  let peeps = g.getMemberNames()
  data = []
  let f = function(n) { return ns.sprintf("%.2f", n) }
  for (let p of peeps) {
    let mi = g.getMemberInformation(p)
    data.push([
      mi.name,
      mi.task,
      f(mi.earnedRespect),
      ns.sprintf("%d/%d/%d/%d/%d", mi.str, mi.def, mi.dex, mi.agi, mi.cha),
      mi.upgrades.length,
      mi.augmentations.length,
      f(mi.respectGain),
      f(mi.wantedLevelGain),
      f(mi.moneyGain),
    ])
  }

  ns.tprintf(table(ns,
    ["Name", "Task", "Respect", "Stats", "Upgrades", "Augs", "Respect/s", "Wanted/s", "Money/s"],
    data))
}

/** @param {NS} ns */
async function recruit(ns) {
  const colors = [
    "Red", "Green", "Blue", "Black", "White", "Grey", "Purple", "Violet",
    "Orange", "Brown"
  ]

  const animals = [
    "Mouse", "Hawk", "Falcon", "Eagle", "Snake", "Horse", "Cat", "Dog", "Tiger",
    "Lion", "Llama", "Moose", "Elk", "Rhino", "Heron", "Shark", "Whale", "Eel"
  ]

  let g = ns.gang
  if (!await g.canRecruitMember()) {
    ns.tprintf("Can't recuit")
    return
  }

  let peeps = g.getMemberNames()
  const roll = (l) => l[Math.floor(Math.random()*l.length)]
  const mkName = () => roll(colors) + " " + roll(animals)
  let n = mkName()
  while (peeps.includes(n)) mkName()
  ns.tprintf("Recruiting %s", n)
  await g.recruitMember(n)
}

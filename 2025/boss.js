import { info, critical } from "@/log.js"
import { singleInstance } from "@/lib/util.js"

/*
 * Gang manager:
 *
 * - When possible recruit new members
 * - When possible, buy gear (skip hacking-releated though)
 * - Ascend at some point
 * - Assign tasks according to priorities
 *   - if combat skills below 200, train that
 *   - if cha is below 150, traing that
 *   - keep wanted level within reason
 *   - Make money
 *   - Expand territory
 */

/** @param {NS} ns */
export async function main(ns) {
  if (!singleInstance(ns)) return
  if (!await ns.gang.inGang()) {
    if (!ns.gang.createGang("Slum Snakes")) {
      await critical(ns, "Not in a gang")
      return
    }
    await info(ns, "Created gang")
  }
  [
    "asleep",
    "gang.purchaseEquipment",
  ].forEach((f) => ns.disableLog(f))

  let g = ns.gang
  await info(ns, "Starting gang loop")
  while (true) {
    await g.nextUpdate()

    await recruit(ns)
    await equip(ns)
    await ascend(ns)
    await assign(ns)

    await ns.asleep(1000)
  }
}

async function ascend(ns) {
  ns.printf("Ascend not implemented yet")
  return
}

async function assign(ns) {
  const combatTarget = 200
  const chaTarget = 150
  let g = ns.gang
  let gi = g.getGangInformation()
  let peeps = g.getMemberNames()
  let doing = new Map()

  for (let p of peeps) doing.set(p, await g.getMemberInformation(p))
  let batLight = 0
  if (gi.wantedLevelGainRate > 0) batLight = 1
  if (gi.wantedLevelGainRate < -0.3) batLight = -1
  for (let p of peeps) {
    let task = ""
    let s = doing.get(p)
    // If we need to train, do that
    if ((s.str+s.def+s.dex+s.agi)/4 < combatTarget) {
      task = "Train Combat"
    } else if (s.cha < chaTarget) {
      task = "Train Charisma"
    }
    // Do we need to reduce wanted level?
    if (s.task == "Vigilante Justice" && batLight < 0) {
      task = ""
      batLight++
    }
    if (s.task != "Vigilante Justice" && batLight > 0) {
      task = "Vigilante Justice"
      batLight--
    }
    if (s.task == "Vigilante Justice" && batLight == 0)
      task = "Vigilante Justice"
    // Pick a task (for now, always arms)
    if (task == "") task = "Traffick Illegal Arms"

    if (s.task != task) {
      await info(ns, "Switching %s to %s", p, task)
      g.setMemberTask(p, task)
    }
  }
  return
}

/** @param {NS} ns */
async function equip(ns) {
  let g = ns.gang
  const ignore = [
    "BitWire",
    "Neuralstimulator",
    "DataJack",
  ]

  let eq = g.getEquipmentNames().filter(
    (n) => !ignore.includes(n)
  ).map(
    (n) => new Object({
      name: n,
      cost: g.getEquipmentCost(n),
      type: g.getEquipmentType(n),
    })
  )
  let peeps = g.getMemberNames()
  let loadout = new Map()
  for (let p of peeps) {
    loadout.set(p, await g.getMemberInformation(p))
  }
  for (let e of eq.sort((a,b) => a.cost - b.cost)) {
    for (let p of peeps) {
      if (loadout.get(p).upgrades.includes(e.name)) continue
      if (await g.purchaseEquipment(p, e.name)) {
        await info(ns, "%s bought %s for $%s", p, e.name, ns.formatNumber(e.cost))
      } else {
        return
      }
    }
  }
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
  const roll = (l) => l[Math.floor(Math.random()*l.length)]
  const mkName = () => roll(colors) + " " + roll(animals)

  let g = ns.gang
  while (await g.canRecruitMember()) {
    let peeps = g.getMemberNames()
    let n = mkName()
    while (peeps.includes(n)) mkName()
    ns.printf("Recruiting %s", n)
    await g.recruitMember(n)
  }
}

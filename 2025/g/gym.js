import {gyms, univs} from "@/lib/constants.js"
import {nsRPC} from "@/lib/nsRPC.js"
import {checkBM} from "@/lib/util.js"

/** @param {NS} ons */
export async function main(ons) {
  // ons.ramOverride(2.4)
  let ns = new nsRPC(ons)
  ns.disableLog("asleep")
  let flags = ns.flags([
    ["str", false],
    ["agi", false],
    ["def", false],
    ["dex", false],
    ["cha", false],
    ["hack", false],
    ["focus", false],
  ]);
  let target = flags._[0];
  if (target == undefined) {
    ns.tprintf("Target must be specified")
    return
  }
  target = Number(target);
  let stats = [];
  if (flags.str) { stats.push("strength") }
  if (flags.agi) { stats.push("agility") }
  if (flags.def) { stats.push("defense") }
  if (flags.dex) { stats.push("dexterity") }
  if (flags.cha) { stats.push("charisma") }
  if (flags.hack) { stats.push("hacking") }
  if (stats.length == 0) {
    stats = [
      "defense",
      "strength",
      "agility",
      "dexterity",
      "charisma",
    ];
  }
  ns.tprintf("Training to %d: %j", target, stats)

  let sk = ns.getPlayer().skills
  let gym = getFacility(ns, gyms)
  let univ = getFacility(ns, univs)
  let started = false
  for (let s of stats) {
    if (sk[s] < target) {
      started = true
      if (["charisma", "hacking"].includes(s)) {
        if (univ == "") {
          ns.tprintf("No uni here.")
          continue
        }
        await course(ns, univ, s, flags["focus"], target)
        continue
      }
      if (gym == "") {
        ns.tprintf("No gym here.")
        continue
      }
      await train(ns, gym, s, flags["focus"], target)
    }
  }

  if (started) ns.toast("Done training at the gym", "success", null)
}

async function course(ns, uni, s, focus, target) {
  let topic = ""
  if (s == "charisma") {
    topic = "Leadership"
  } else {
    topic = "Algorithms"
  }
  while (ns.getPlayer().skills[s] < target) {
    if (checkBM(ns)) {
      ns.toast("Aborting gym when bm is running")
      ns.exit()
    }
    if (ns.singularity.getCurrentWork()?.classType != topic)
      ns.singularity.universityCourse(uni, topic, focus)
    await ns.asleep(1000)
  }
  ns.printf("Finished training %s: %d", s, ns.getPlayer().skills[s])
  ns.singularity.stopAction()
}

async function train(ns, gym, stat, focus, target) {
  while (ns.getPlayer().skills[stat] < target) {
    checkBM(ns)
    if (ns.singularity.getCurrentWork()?.classType != stat.toLowerCase().slice(0, 3))
      ns.singularity.gymWorkout(gym, stat.slice(0,3), focus)
    await ns.asleep(1000)
  }
  ns.printf("Finished training stat: %d", ns.getPlayer().skills[stat])
  ns.singularity.stopAction()
}

function getFacility(ns, yb) {
  let city = ns.getPlayer().city
  if (yb.has(city)) {
    return yb.get(city)
  }
  return ""
}

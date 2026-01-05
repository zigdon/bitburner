var gyms = new Map([
  ["Sector-12", "Powerhouse Gym"],
  ["Aevum", "Snap Fitness Gym"],
  ["Volhaven", "Millenium Fitness Gym"],
]);

var univs = new Map([
  ["Sector-12", "Rothman University"],
  ["Volhaven", "ZB Institute of Technology"],
])

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("asleep")
  var flags = ns.flags([
    ["str", false],
    ["agi", false],
    ["def", false],
    ["dex", false],
    ["cha", false],
    ["hack", false],
    ["focus", false],
  ]);
  var target = flags._[0];
  if (target == undefined) {
    ns.tprintf("Target must be specified")
    return
  }
  target = Number(target);
  var stats = [];
  if (flags.str) { stats.push("strength") }
  if (flags.agi) { stats.push("agility") }
  if (flags.def) { stats.push("defense") }
  if (flags.dex) { stats.push("dexterity") }
  if (flags.cha) { stats.push("charisma") }
  if (flags.hack) { stats.push("hacking") }
  if (stats.length == 0) {
    stats = [
      "strength",
      "agility",
      "defense",
      "dexterity",
      "charisma",
      "hacking",
    ];
  }
  ns.tprintf("Training to %d: %j", target, stats)

  var sk = ns.getPlayer().skills
  var gym = getFacility(ns, gyms)
  var univ = getFacility(ns, univs)
  for (var s of stats) {
    if (sk[s] < target) {
      if (["charisma", "hacking"].includes(s)) {
        if (univ == "") {
          ns.tprintf("No uni here.")
          return
        }
        await course(ns, univ, s, flags["focus"], target)
        continue
      }
      if (gym == "") {
        ns.tprintf("No gym here.")
        return
      }
      await train(ns, gym, s, flags["focus"], target)
    }
  }

  ns.toast("Done training at the gym", "success", null)
}

async function course(ns, uni, s, focus, target) {
  while (ns.getPlayer().skills[s] < target) {
    if (s == "charisma") {
      ns.singularity.universityCourse(uni, "Leadership", focus)
    } else {
      ns.singularity.universityCourse(uni, "Algorithms", focus)
    }
    await ns.asleep(1000)
  }
  ns.printf("Finished training %s: %d", s, ns.getPlayer().skills[s])
  ns.singularity.stopAction()
}

async function train(ns, gym, stat, focus, target) {
  while (ns.getPlayer().skills[stat] < target) {
    ns.singularity.gymWorkout(gym, stat.slice(0,3), focus)
    await ns.asleep(1000)
  }
  ns.printf("Finished training stat: %d", ns.getPlayer().skills[stat])
  ns.singularity.stopAction()
}

function getFacility(ns, yb) {
  var city = ns.getPlayer().city
  if (yb.has(city)) {
    return yb.get(city)
  }
  return ""
}

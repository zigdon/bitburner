/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("asleep")
  var flags = ns.flags([
    ["str", false],
    ["agi", false],
    ["def", false],
    ["dex", false],
    ["cha", false],
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
  if (stats.length == 0) {
    stats = [
      "strength",
      "agility",
      "defense",
      "dexterity",
      "charisma",
    ];
  }
  ns.tprintf("Training to %d: %j", target, stats)

  var sk = ns.getPlayer().skills
  var gym = getGym(ns)
  for (var s of stats) {
    if (s == "charisma") {
      if (sk["charisma"] < target) {
        await course(ns, flags["focus"], target)
      }
    } else if (sk[s] < target) {
      if (gym == "") {
        ns.tprintf("No gym here.")
        return
      }
      await train(ns, gym, s, flags["focus"], target)
    }
  }
}

var univ = new Map([
  ["Sector-12", "Rothman University"],
])

async function course(ns, focus, target) {
  var city = ns.getPlayer().city
  if (!univ.has(city)) {
    ns.tprintf("No univ here.")
    return
  }

  while (ns.getPlayer().skills["charisma"] < target) {
    ns.singularity.universityCourse(univ.get(city), "Leadership", focus)
    await ns.asleep(1000)
  }
  ns.printf("Finished training cha: %d", ns.getPlayer().skills["charisma"])
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

var gyms = new Map([
  ["Sector-12", "Powerhouse Gym"],
  ["Aevum", "Snap Fitness Gym"],
  ["Volhaven", "Millenium Fitness Gym"],
]);

function getGym(ns) {
  var city = ns.getPlayer().city
  if (gyms.has(city)) {
    return gyms.get(city)
  }
  return ""
}

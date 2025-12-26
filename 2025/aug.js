import { colors } from "@/colors.js"
import { table } from "@/table.js"
import { getFactions, factions } from "@/factions.js"

var cmds = new Map([
  ["list", list],
  ["show", show],
  ["buy", buy],
])

/** @param {NS} ns */
export async function main(ns) {
  var fs = ns.flags([
    ["all", false],
    ["augs", ""],
    ["factions", ""],
    ["sort", ""],
  ])
  var cmd = fs._[0]
  if (cmds.has(cmd)) {
    await cmds.get(cmd)(ns, fs)
  } else {
    ns.tprintf("Commands: %s", Array.from(cmds.keys()).join(", "))
  }
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  return [...Array.from(cmds.keys()), ...factions]
}

/**
 * @param {NS} ns
 * @param {String} name
 * */
function show(ns, flags) {
  var name = flags._[1]
  var augs = getAllAugs(ns, flags).filter(
    (a) => a.toLowerCase() == name.toLowerCase())
  if (augs.length == 0) {
    augs = getAllAugs(ns, flags).filter(
      (a) => a.toLowerCase().includes(name.toLowerCase()))
  }
  if (augs.length == 0) {
    ns.tprintf("No augs match %j", name)
    return
  } else if (augs.length > 1) {
    ns.tprintf("Augs matching %j:", name)
    augs.forEach((a) => ns.tprintf("  %s", a))
    return
  }

  var a = augs[0]
  var data = [
    ["Cost", "$"+ns.formatNumber(ns.singularity.getAugmentationPrice(a))],
    ["Rep Required", ns.formatNumber(ns.singularity.getAugmentationRepReq(a))],
    ["Factions", ns.singularity.getAugmentationFactions(a).join(", ")],
  ]
  var s = ns.singularity.getAugmentationStats(a)
  for (var p in s) {
    if (s[p] != 1) {
      data.push(["  "+p, ns.formatNumber(s[p])])
    }
  }
  ns.tprint(table(ns, ["Name", augs[0]], data))
}

function getAllAugs(ns, flags) {
  var augs = []
  for (var f of getFactions(ns, flags)) {
    augs.push(...ns.singularity.getAugmentationsFromFaction(f))
  }
  augs = augs.sort().filter((a, i) => i==0 || a!=augs[i-1])

  return augs
}
  
/** @param {NS} ns */
function list(ns, flags) {
  var augs = getAllAugs(ns, flags).filter((a) => a.includes(flags["augs"]))
  var owned = ns.singularity.getOwnedAugmentations(true)
  var joined = getFactions(ns, {all: false})
  var data = []
  var missing = []
  var money = ns.getPlayer().money
  if (flags["sort"] == "price") {
    augs = augs.sort((a,b) =>
      ns.singularity.getAugmentationPrice(a) - ns.singularity.getAugmentationPrice(b))
  }
  for (var a of augs) {
    if (owned.includes(a)) {
      continue
    }
    var fs = ns.singularity.getAugmentationFactions(a).filter(
      (f) => joined.includes(f)
    )
    var price = ns.singularity.getAugmentationPrice(a)
    fs.forEach((f) => !missing.includes(f) && missing.push(f))
    data.push([
      a,
      [
        "$"+ns.formatNumber(price),
        owned.includes(a) ? "black" : price > money ? "red" : "green"
      ],
      [ns.formatNumber(ns.singularity.getAugmentationRepReq(a)),
        ns.singularity.getAugmentationFactions(a).filter(
          (f) => joined.includes(f) &&
                 ns.singularity.getFactionRep(f) >=
                   ns.singularity.getAugmentationRepReq(a)
        ).length > 0 ? "green" : "red"
      ],
      [
        fs.length > 0
        ? fs.join(", ")
        : ns.singularity.getAugmentationFactions(a).length > 1
        ? ns.singularity.getAugmentationFactions(a).length
        : ns.sprintf("(%s)", ns.singularity.getAugmentationFactions(a))
      ],
    ])
  }

  ns.tprintf(table(ns, ["Name", "Price", "RepReq", "Factions"], data))
  missing.sort().forEach(
    (f) => ns.tprintf("%s: %s%s%s", f, colors["white"],
      ns.formatNumber(ns.singularity.getFactionRep(f)),
      colors["reset"],
    ))
}

function findFactionForAug(ns, a) {
  var fs = ns.singularity.getAugmentationFactions(a).filter(
    (f) => ns.singularity.getFactionRep(f) >=
             ns.singularity.getAugmentationRepReq(a))
  ns.tprintf("%s can be bought from %j", a, fs)
  return fs[0]
}

async function buy(ns, flags) {
  var owned = ns.singularity.getOwnedAugmentations(true)
  var cash = ns.getPlayer().money
  var augs = getAllAugs(ns, flags).filter(
    (a) => !owned.includes(a) && a.includes(flags["augs"])
  ).map((a) => [a, findFactionForAug(ns, a)]
  ).filter(
    (a) => a[1]?.length > 0
  ).filter(
    (a) => ns.singularity.getAugmentationPrice(a[0]) < cash
  ).sort(
    (a,b) => ns.singularity.getAugmentationPrice(b[0]) -
             ns.singularity.getAugmentationPrice(a[0])
  )

  ns.tprintf("Buying %d augs", augs.length)
  while (augs.length > 0) {
    await ns.asleep(10)
    let price = ns.singularity.getAugmentationPrice(augs[0][0])
    if (ns.getPlayer().money >= price) {
      ns.tprintf("Trying to buy %s for $%s", augs[0][0], ns.formatNumber(price))
      if (!buyAug(ns, augs.shift())) {
        break
      }
    } else {
      ns.tprintf("Can't afford %s for $%s", augs.shift()[0], ns.formatNumber(price))
      break
    }
  }
}

function buyAug(ns, a) {
  ns.printf("Buying %s from %s", a[0], a[1])
  var owned = ns.singularity.getOwnedAugmentations(true)
  if (owned.includes(a[0])) {
    return true
  }

  for (var pre of ns.singularity.getAugmentationPrereq(a[0])) {
    var seller = findFactionForAug(ns, pre)
    if (!seller) {
      ns.tprintf("Can't find seller for %s, needed for %s. Aborting", pre, a[0])
      return false
    }
    ns.printf("Buying prereq %s from %s", pre)
    if (!buyAug(ns, [pre, seller])) {
      ns.printf("Buying failed!")
      return false
    }
  }

  if (ns.singularity.purchaseAugmentation(a[1], a[0])) {
    ns.tprintf("Bought %s from %s", a[0], a[1])
    return true
  } else{
    ns.tprintf("Couldn't buy %s from %s", a[0], a[1])
    return false
  }
}


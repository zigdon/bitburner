import { colors } from "@/colors.js"
import { table } from "@/table.js"
import { factionList } from "@/lib/constants.js"
import { nsRPC } from "@/lib/nsRPC.js"

var cmds = new Map([
  ["list", list],
  ["show", show],
  ["buy", buy],
])

var augData = new Map()
var factionData = new Map()

/** @param {NS} ns */
export async function main(ons) {
  ons.ramOverride(5.1)
  augData.clear()
  factionData.clear()
  let ns = new nsRPC(ons)
  var fs = ns.flags([
    ["all", false],
    ["augs", ""],
    ["factions", ""],
    ["sort", ""],
    ["stats", ""],
  ])
  await loadData(ns, fs)
  var cmd = fs._[0]
  if (cmds.has(cmd)) {
    await cmds.get(cmd)(ns, fs)
  } else {
    ns.tprintf("Commands: %s", Array.from(cmds.keys()).join(", "))
  }
}

/** @param {NS} ns */
export async function loadData(ns, flags) {
  let s = ns.singularity
  let joined = ns.getPlayer().factions
  let owned = await s.getOwnedAugmentations(true)
  for (let f of factionList) {
    if (!flags["all"] && !joined.includes(f)) continue
    let augs = await s.getAugmentationsFromFaction(f)
    factionData.set(f, {
      name: f,
      joined: joined.includes(f),
      rep: await s.getFactionRep(f),
      augs: augs,
    })
    for (let a of augs) {
      let stats = await s.getAugmentationStats(a)
      if (flags["stats"] != "" && !Object.entries(stats).some(
        ([s, v]) => s.toLowerCase().includes(flags["stats"]) && v != 1
      )) continue
      if (!augData.has(a)) {
        augData.set(a, {
          name: a,
          factions: [],
          price: await s.getAugmentationPrice(a),
          rep: await s.getAugmentationRepReq(a),
          reqs: await s.getAugmentationPrereq(a),
          stats: await s.getAugmentationStats(a),
          owned: owned.includes(a),
        })
      }
      augData.get(a).factions.push(f)
    }
  }
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  return [...Array.from(cmds.keys()), ...factionList]
}

/**
 * @param {NS} ns
 * @param {String} name
 * */
async function show(ns, flags) {
  var name = flags._[1]
  var augs = Array.from(augData.keys()).filter(
    (a) => a.toLowerCase() == name.toLowerCase())
  if (augs.length == 0) {
    augs = Array.from(augData.keys()).filter(
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

  var a = augData.get(augs[0])
  var data = [
    ["Cost", "$"+ns.formatNumber(a.price)],
    ["Rep Required", ns.formatNumber(a.rep)],
    ["Factions", a.factions.join(", ")],
  ]
  for (var p in a.stats) {
    if (a.stats[p] != 1) {
      data.push(["  "+p, ns.formatNumber(a.stats[p])])
    }
  }
  ns.tprint(table(ns, ["Name", augs[0]], data))
}

/** @param {NS} ns */
async function list(ns, flags) {
  var data = []
  var missing = []
  var money = ns.getPlayer().money
  var augs = Array.from(augData.keys())
  if (flags["sort"] == "price") {
    augs = augs.sort((a,b) => augData.get(a).price - augData.get(b).price)
  }
  for (var a of augs) {
    let aug = augData.get(a)
    if (aug.owned) continue
    var fs = aug.factions.filter((f) => factionData.get(f).joined)
    missing.push(...fs.filter((f) => !missing.includes(f)))
    data.push([
      a,
      [
        "$"+ns.formatNumber(aug.price),
        aug.owned ? "black" : aug.price > money ? "red" : "green"
      ],
      [
        ns.formatNumber(aug.rep),
        fs.filter(
          (f) => factionData.get(f).rep >= aug.rep
        ).length > 0 ? "green" : "red"
      ],
      [
        fs.length > 0 ?
          fs.join(", ")
        : aug.factions.length > 1 ?
            aug.factions.length
          : ns.sprintf("(%s)", aug.factions)
      ],
    ])
  }

  ns.tprintf(table(ns, ["Name", "Price", "RepReq", "Factions"], data))
  missing.sort().forEach(
    (f) => ns.tprintf("%s: %s%s%s", f, colors["white"],
      ns.formatNumber(factionData.get(f).rep),
      colors["reset"],
    ))
}

async function buy(ns, flags) {
  var cash = ns.getPlayer().money
  var augs = Array.from(augData.values()).filter(
    (a) => !a.owned &&
      a.includes(flags["augs"]) &&
      a.factions.length > 0 &&
      a.price < cash
  ).sort((a,b) => b.price - a.price)

  ns.tprintf("Buying %d augs", augs.length)
  while (augs.length > 0) {
    await ns.asleep(10)
    let aug = augs.shift()
    if (ns.getPlayer().money >= aug.price) {
      ns.tprintf("Trying to buy %s for $%s", aug.name, ns.formatNumber(aug.price))
      if (!buyAug(ns, aug)) break
    } else {
      ns.tprintf("Can't afford %s for $%s", aug.name, ns.formatNumber(aug.price))
      break
    }
  }
}

async function buyAug(ns, a) {
  let fac = a.factions.filter((f) => f.joined)[0]
  ns.printf("Buying %s from %s", a.name, fac)
  if (a.owned) return true

  for (var pre of a.reqs) {
    let req = augData.get(pre)
    var seller = req.factions.filter((f) => f.joined)[0]
    if (!seller) {
      ns.tprintf("Can't find seller for %s, needed for %s. Aborting", pre, a.name)
      return false
    }
    ns.printf("Buying prereq %s from %s", pre, seller)
    if (!buyAug(ns, req)) {
      ns.printf("Buying failed!")
      return false
    }
  }

  if (await ns.singularity.purchaseAugmentation(fac, a.name)) {
    ns.tprintf("Bought %s from %s", a.name, fac)
    return true
  } else{
    ns.tprintf("Couldn't buy %s from %s", a.name, fac)
    return false
  }
}


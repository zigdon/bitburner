import { colors } from "./colors.js"
import { table } from "./table.js"

var factions = [
  // From NetscriptDefinitions.d.ts
  "Aevum",
  "Bachman & Associates",
  "BitRunners",
  "Blade Industries",
  "Bladeburners",
  "Chongqing",
  "Church of the Machine God",
  "Clarke Incorporated",
  "CyberSec",
  "Daedalus",
  "ECorp",
  "Four Sigma",
  "Fulcrum Secret Technologies",
  "Illuminati",
  "Ishima",
  "KuaiGong International",
  "MegaCorp",
  "NWO",
  "Netburners",
  "New Tokyo",
  "NiteSec",
  "OmniTek Incorporated",
  "Sector-12",
  "Shadows of Anarchy",
  "Silhouette",
  "Slum Snakes",
  "Speakers for the Dead",
  "Tetrads",
  "The Black Hand",
  "The Covenant",
  "The Dark Army",
  "The Syndicate",
  "Tian Di Hui",
  "Volhaven",
]

var cmds = new Map([
  ["list", list],
  ["show", show],
  ["faction", listFaction],
])

/** @param {NS} ns */
export async function main(ns) {
  var fs = ns.flags([
    ["all", false],
    ["augs", ""],
    ["factions", ""],
  ])
  var cmd = fs._[0]
  if (cmds.has(cmd)) {
    cmds.get(cmd)(ns, fs)
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
function listFaction(ns, flags) {
  var name = flags._[1] || ""
  var data = []
  var joined = getFactions(ns, {all: false})
  var s = ns.singularity
  var fs = getFactions(ns, {all: true}).filter(
    (f) => f.toLowerCase().includes(name.toLowerCase()))
  if (fs.length == 1) {
    var f = fs[0]
    var enemies = s.getFactionEnemies(f)
    data.push(...[
      ["Rep", ns.formatNumber(s.getFactionRep(f))],
      ["Favor", ns.formatNumber(s.getFactionFavor(f))],
      ["Enemies",
        [enemies.join(", ") || "N/A",
          enemies.reduce((a, e) => a || joined.includes(e), false) ? "red" : "green"],
      ],
      ["Work types", s.getFactionWorkTypes(f).join(", ")],
      ["Reqs:", ""],
    ])

    for (var r of s.getFactionInviteRequirements(f)) {
      data.push([
        "   "+r.type,
        ["money"].includes(r.type) ?
          ns.formatNumber(r[r.type]) :
        ["skills"].includes(r.type) ?
          Object.entries(r.skills).map((v) => v[0]+": "+v[1]) :
          r[r.type],
      ])
    }

    ns.tprint(table(ns, ["Name", f], data))

    return
  }

  for (var f of fs) {
    data.push([
      f,
      ns.formatNumber(s.getFactionRep(f)),
      ns.formatNumber(s.getFactionFavor(f)),
      [s.getFactionEnemies(f).length,
        s.getFactionEnemies(f).reduce(
          (a, e) => a || joined.includes(e), false) ? "red" : "green"
      ],
      s.getFactionWorkTypes(f).map((w)=>w[0]).join("").toUpperCase(),
    ])
  }

  ns.tprint(table(ns, ["Name", "Rep", "Favor", "Enemies", "Work Types"], data))
}

function getFactions(ns, flags) {
  if (flags["all"]) {
    return factions
  }
  return factions.filter(
    (f) => ns.singularity.getFactionRep(f) > 0
  ).filter(
    (f) => f.includes(flags["factions"] || "")
  )
}

/**
 * @param {NS} ns
 * @param {String} name
 * */
function show(ns, flags) {
  var name = flags._[1]
  var augs = getAllAugs(ns, flags).filter(
    (a) => a.toLowerCase().includes(name.toLowerCase()))
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
    ["Cost", "$"+ns.formatNumber(ns.singularity.getAugmentationBasePrice(a))],
    ["Rep Required", ns.formatNumber(ns.singularity.getAugmentationRepReq(a))],
    ["Factions", ns.singularity.getAugmentationFactions(a).join(", ")],
  ]
  var s = ns.singularity.getAugmentationStats(a)
  for (var p in s) {
    if (s[p] != 1) {
      data.push(["  "+p, ns.formatNumber(s[p])])
    }
  }
  ns.tprint(data)
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
  for (var a of augs) {
    if (owned.includes(a)) {
      continue
    }
    var fs = ns.singularity.getAugmentationFactions(a).filter(
      (f) => joined.includes(f)
    )
    data.push([
      a,
      [
        "$"+ns.formatNumber(ns.singularity.getAugmentationBasePrice(a)),
        owned.includes(a) ? "black" : "green"
      ],
      [ns.formatNumber(ns.singularity.getAugmentationRepReq(a)),
        ns.singularity.getAugmentationFactions(a).filter(
          (f) => joined.includes(f) &&
                 ns.singularity.getFactionRep(f) >=
                   ns.singularity.getAugmentationRepReq(a)
        ).length > 0 ? "green" : "red"
      ],
      [
        fs.length == 0 ?
          ns.singularity.getAugmentationFactions(a).length :
          fs.join(", ")
      ],
    ])
  }

  ns.tprint(table(ns, ["Name", "Price", "RepReq", "Factions"], data))
}

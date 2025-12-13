import { colors } from "@/colors.js"
import { table } from "@/table.js"

export var factions = [
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
    ["Factions", ns.singularity.getAugmentationFactions(a).join(", ")],
  ]
  ns.tprint(table(ns, ["Name", augs[0]], data))
}

function getAllAugs(ns, flags) {
  var augs = []
  for (var f of factions) {
    augs.push(...ns.singularity.getAugmentationsFromFaction(f))
  }
  augs = augs.sort().filter((a, i) => i==0 || a!=augs[i-1])

  return augs
}
  
/** @param {NS} ns */
function list(ns, flags) {
  var augs = getAllAugs(ns, flags).filter((a) => a.includes(flags["augs"]))
  var joined = factions
  var data = []
  var missing = []
  for (var a of augs) {
    var fs = ns.singularity.getAugmentationFactions(a).filter(
      (f) => joined.includes(f)
    )
    fs.forEach((f) => !missing.includes(f) && missing.push(f))
    data.push([
      a,
      "$"+ns.formatNumber(ns.singularity.getAugmentationPrice(a)),
      [
        fs.length > 0
        ? fs.join(", ")
        : ns.singularity.getAugmentationFactions(a).length > 1
        ? ns.singularity.getAugmentationFactions(a).length
        : ns.sprintf("(%s)", ns.singularity.getAugmentationFactions(a))
      ],
    ])
  }

  ns.tprintf(table(ns, ["Name", "Price", "Factions"], data))
  missing.sort().forEach(
    (f) => ns.tprintf("%s: %s%s%s", f, colors["white"],
      ns.formatNumber(ns.singularity.getFactionRep(f)),
      colors["reset"],
    ))
}

function findFactionForAug(ns, a) {
  var fs = ns.singularity.getAugmentationFactions(a)
  ns.tprintf("%s can be bought from %j", a, fs)
  return fs[0]
}

import { colors } from "/colors.js"
import { table } from "/table.js"

var factions = [
  "CyberSec",
  "Illuminati",
  "NiteSec",
  "Sector-12",
]

/** @param {NS} ns */
export async function main(ns) {
  var cmd = ns.args[0]
  switch (cmd) {
    case "list":
      list(ns)
      break
    default:
      ns.tprintf("unimplemented %s", cmd)
  }
}
  
/** @param {NS} ns */
function list(ns) {
  var augs = []
  for (var f of factions) {
    augs.push(...ns.singularity.getAugmentationsFromFaction(f))
  }
  augs = augs.sort().filter((a, i) => i==0 || a!=augs[i-1])
  var data = []
  for (var a of augs) {
    var s = ns.singularity.getAugmentationStats(a)
    var stats = []
    for (var p in s) {
      if (s[p] != 1) {
        stats.push(p, s[p])
      }
    }
    data.push([
      ["$"+ns.formatNumber(ns.singularity.getAugmentationBasePrice(a))],
      [stats],
      [ns.singularity.getAugmentationPrereq(a)],
      [ns.singularity.getAugmentationRepReq(a)],
      [ns.singularity.getAugmentationFactions(a)],
    ])
  }

  ns.tprint(table(ns, ["Price", "Stats", "Prereqs", "RepReq", "Factions"], data))
}

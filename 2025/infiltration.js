import { colors } from "@/colors.js"
import { table } from "@/table.js"

var sortFn = new Map([
  ["name", (a,b) => a[0] < b[0] ? -1 : a[0] == b[0] ? 0 : 1],
  ["city", (a,b) => a[1] < b[1] ? -1 : a[1] == b[1] ? 0 : 1],
  ["diff", (a,b) => Number(a[2]) - Number(b[2])],
  ["lvl", (a,b) => Number(a[3]) - Number(b[3])],
  ["start", (a,b) => Number(a[4]) - Number(b[4])],
  ["trade", (a,b) => Number(a[5]) - Number(b[5])],
  ["pert", (a,b) => Number(a[6]) - Number(b[6])],
  ["sell", (a,b) => Number(a[7]) - Number(b[7])],
  ["perc", (a,b) => Number(a[8]) - Number(b[8])],
  ["soa", (a,b) => Number(a[9]) - Number(b[9])],
  ["perr", (a,b) => Number(a[10]) - Number(b[10])],
])

/** @param {NS} ns */
export async function main(ns) {
  var flags = ns.flags([
    ["sort", ""],
    ["all", false],
  ])
  var targets = ns.infiltration.getPossibleLocations().sort(
    (a,b) => a.name < b.name ? -1 : a.name == b.name ? 0 : 1)
  var loc = ns.getPlayer().city
  var data = []
  for (var target of targets) {
    var t = ns.infiltration.getInfiltration(target.name)
    if (t.difficulty == 3 && !flags["all"]) {
      continue
    }
    data.push([
      target.name,
      [target.city, target.city == loc ? "white" : "green"],
      [ns.sprintf("%.2f", t.difficulty), t.difficulty < 3 ? "green" : "red"],
      t.maxClearanceLevel,
      t.startingSecurityLevel,
      t.reward.tradeRep,
      t.reward.tradeRep/t.maxClearanceLevel,
      t.reward.sellCash,
      t.reward.sellCash/t.maxClearanceLevel,
      t.reward.SoARep,
      t.reward.SoARep/t.maxClearanceLevel,
    ])
  }

  if (sortFn.has(flags["sort"])) {
    data.sort(sortFn.get(flags["sort"]))
  } else if (flags["sort"] == "") {
    data.sort(sortFn.get("name"))
  } else {
    ns.tprintf("Sort options: %s", Array.from(sortFn.keys()).join(", "))
    return
  }

  data.forEach((l, i) => {
    l[5] = ns.formatNumber(l[5])
    l[6] = ns.formatNumber(l[6])
    l[7] = "$"+ns.formatNumber(l[7])
    l[8] = "$"+ns.formatNumber(l[8])
    l[9] = ns.formatNumber(l[9])
    l[10] = ns.formatNumber(l[10])
  })

  ns.tprintf(table(ns, [
    "Name", "City", "Difficulty", "Max Level", "Starting Level",
    "Trade", "Trade/Level", "Sell", "Cash/Level", "SoA Rep", "SoA Rep/Level"
  ], data))
}


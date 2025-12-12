import { colors } from "@/colors.js"
import { table } from "@/table.js"

/** @param {NS} ns */
export async function main(ns) {
  var targets = ns.infiltration.getPossibleLocations().sort(
    (a,b) => a.name < b.name ? -1 : a.name == b.name ? 0 : 1)
  var loc = ns.getPlayer().city
  ns.tprint(loc)
  var data = []
  for (var target of targets) {
    var t = ns.infiltration.getInfiltration(target.name)
    data.push([
      target.name,
      [target.city, target.city == loc ? "white" : "green"],
      ns.sprintf("%.2f", t.difficulty),
      t.maxClearanceLevel,
      t.startingSecurityLevel,
      ns.formatNumber(t.reward.tradeRep),
      "$"+ns.formatNumber(t.reward.sellCash),
      ns.formatNumber(t.reward.SoARep),
    ])
  }

  ns.tprintf(table(ns, [
    "Name", "City", "Difficulty", "Max Level", "Starting Level",
    "Trade", "Sell", "SoA Rep"
  ], data))
}


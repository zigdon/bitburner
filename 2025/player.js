import { table } from "/table.js"
/** @param {NS} ns */
export async function main(ns) {
  var data = []
  var i = ns.getMoneySources().sinceInstall
  var s = ns.getMoneySources().sinceStart
  for (var p in s) {
    data.push([p, ns.formatNumber(i[p]), ns.formatNumber(s[p])])
  }
  ns.tprint(
    table(ns, ["Source", "Since Install", "Since Start"], data)
  )
}

import { dns } from "@/hosts.js"
import { table } from "@/table.js"
/** @param {NS} ns */
export async function main(ns) {
  var hosts = dns(ns)
  var ps = []
  var allMem = 0
  var usedMem = 0
  for (var h of hosts.keys()) {
    ps.push(...ns.ps(h))
    allMem += ns.getServerMaxRam(h)
    usedMem += ns.getServerUsedRam(h)
  }

  var summary = new Map()
  for (var p of ps) {
    if (!["bin/grow.js", "bin/hack.js", "bin/weaken.js"].includes(p.filename)) {
      continue
    }
    var target = p.args[0]
    var ent = {}
    if (summary.has(target)) {
      ent = summary.get(target)
    } else {
      var min = ns.getServerMinSecurityLevel(target)
      var base = ns.getServerBaseSecurityLevel(target)
      var sec = ns.getServerSecurityLevel(target)
      ent = {
        host: target, w: 0, g: 0, h: 0,
        mon: "$" + ns.formatNumber(ns.getServerMoneyAvailable(target)),
        sec: ns.sprintf("%%%d", 100 * (sec - min) / (base - min)),
      }
    }
    ent[p.filename[p.filename.indexOf("/")+1]] += p.threads
    summary.set(target, ent)
  }

  ns.tprint(
    table(
      ns,
      ["Target", "Hack", "Grow", "Weaken", "Money", "Security"],
      Array.from(summary.keys()).sort().map((h) => [
        summary.get(h).host,
        summary.get(h).h,
        summary.get(h).g,
        summary.get(h).w,
        summary.get(h).mon,
        summary.get(h).sec,
      ])
    )
  )
  ns.tprintf(
    "Util: %s/%s (%%%d)",
    ns.formatRam(usedMem),
    ns.formatRam(allMem),
    100*usedMem/allMem,
  )
}

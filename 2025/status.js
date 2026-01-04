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
        host: target, w: [], g: [], h: [],
        mon: ns.getServerMoneyAvailable(target),
        sec: ns.sprintf("%%%d", 100 * (sec - min) / (base - min)),
        srv: ns.getServer(target),
      }
    }
    ent[p.filename[p.filename.indexOf("/")+1]].push(p.threads)
    summary.set(target, ent)
  }

  let player = ns.getPlayer()
  const sum = (l) => l.reduce((a,i) => a + i, 0)
  const details = (procs) => [
    sum(procs),
    procs.length > 0 ? Math.min(...procs) : 0,
    procs.length > 0 ? Math.max(...procs) : 0,
    procs.length
  ]
  const loot = (ent) => 
    ns.fileExists("Formulas.exe") && ent.h.length > 0 ?
      "$" + ns.formatNumber(
        ns.formulas.hacking.hackPercent(ent.srv, player) * sum(ent.h) * ent.mon
      ) : "N/A"

  ns.tprint(
    table(
      ns,
      ["Target", "Hack", "Grow", "Weaken", "Take", "Money", "Security"],
      Array.from(summary.keys()).sort().map((h) => [
        summary.get(h).host,
        [ns.sprintf("%d (%d-%d, %d hosts)", ...details(summary.get(h).h))],
        [ns.sprintf("%d (%d-%d, %d hosts)", ...details(summary.get(h).g))],
        [ns.sprintf("%d (%d-%d, %d hosts)", ...details(summary.get(h).w))],
        loot(summary.get(h)),
        "$" + ns.formatNumber(summary.get(h).mon),
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

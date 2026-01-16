import { dns } from "@/hosts.js"
import { table } from "@/table.js"
/** @param {NS} ns */
export async function main(ns) {
  [
    "getServerBaseSecurityLevel",
    "getServerMinSecurityLevel",
    "getServerMoneyAvailable",
    "getServerSecurityLevel",
    "getServerMaxRam",
    "getServerUsedRam",
  ].forEach(f => ns.disableLog(f))
  var hosts = dns(ns)
  var allMem = 0
  var usedMem = 0
  
  for (var h of Array.from(
    hosts.values()
  ).filter(
    (h) => h.root
  ).map(
    (h) => h.name
  )) {
    allMem += ns.getServerMaxRam(h)
    usedMem += ns.getServerUsedRam(h)
  }

  var summary = collectData(ns)

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
      ) : ent.hack * sum(ent.h)

  ns.tprint(
    table(
      ns,
      ["Target", "Hack", "Grow", "Weaken", "Take", "Money", "Security %"],
      Array.from(summary.keys()).sort().map((h) => [
        summary.get(h).host,
        [ns.sprintf("%d (%d-%d, %d hosts)", ...details(summary.get(h).h))],
        [ns.sprintf("%d (%d-%d, %d hosts)", ...details(summary.get(h).g))],
        [ns.sprintf("%d (%d-%d, %d hosts)", ...details(summary.get(h).w))],
        ns.sprintf("%s (%s)", loot(summary.get(h)),
          summary.get(h).h.length > 0 ? ns.tFormat(summary.get(h).when || 0) : "-"),
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

export function collectData(ns) {
  var hosts = dns(ns)
  var ps = []
  for (var h of hosts.keys()) {
    ps.push(...ns.ps(h))
  }
  var now = Date.now()
  var summary = new Map()
  for (var p of ps) {
    if (!["bin/grow.js", "bin/hack.js", "bin/weaken.js"].includes(p.filename)) {
      continue
    }
    var target = p.args[0]
    var ts = p.args[2]
    var ent = {}
    if (summary.has(target)) {
      ent = summary.get(target)
    } else {
      let srv = ns.getServer(target)
      var min = srv.minDifficulty
      var base = srv.baseDifficulty
      var sec = srv.hackDifficulty
      ent = {
        host: target, w: [], g: [], h: [],
        mon: srv.moneyAvailable,
        sec: ns.sprintf("%d", 100 * (sec - min) / (base - min)),
        srv: srv,
        hack: ns.hackAnalyze(target),
        when: ts - now,
      }
    }
    ent[p.filename[p.filename.indexOf("/")+1]].push(p.threads)
    summary.set(target, ent)
  }

  return summary
}

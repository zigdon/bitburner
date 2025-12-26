import { dns } from "@/hosts.js"
import { parseNumber } from "@/lib/util.js"
/** @param {NS} ns */
export async function main(ns) {
  var reserve = ns.args[0] ? parseNumber(ns.args[0]) : 50
  do {
    var total = 0
    var hosts = dns(ns)
    for (var h of hosts.keys()) {
      ns.scp("bin/share.js", h)
      var avail = ns.getServerMaxRam(h) - ns.getServerUsedRam(h)
      if (h == "home") {
        avail -= reserve
      }
      if (avail < 4) {
        continue
      }
      total += Math.floor(avail/4)*4
      ns.exec("bin/share.js", h, Math.floor(avail/4))
    }
    ns.toast(ns.sprintf("Sharing %s", ns.formatRam(total)), "info")
    await ns.asleep(11000)
  } while (true)
}

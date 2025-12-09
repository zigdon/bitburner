import { dns } from "@/hosts.js"
/** @param {NS} ns */
export async function main(ns) {
  var reserve = 50
  var hosts = dns(ns)
  do {
    var total = 0
    for (var h of hosts.keys()) {
      ns.scp("server-share.js", h)
      var avail = ns.getServerMaxRam(h) - ns.getServerUsedRam(h)
      if (h == "home") {
        avail -= reserve
      }
      if (avail < 4) {
        continue
      }
      total += Math.floor(avail/4)*4
      ns.exec("server-share.js", h, Math.floor(avail/4))
    }
    ns.toast(ns.sprintf("Sharing %s", ns.formatRam(total)), "info")
    await ns.asleep(11000)
  } while (true)
}

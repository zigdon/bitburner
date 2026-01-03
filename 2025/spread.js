import { dns } from "@/hosts.js"

/** @param {NS} ns */
export async function main(ns) {
  let [tool, target, threads] = ns.args
  await spread(ns, ns.sprintf("bin/%s.js", tool), threads, target, 0)
}

/**
 * @param {NS} ns
 * @param {String} tool
 * @param {Number} threads
 * @param {String} target
 * @param {Number} ts
 */
async function spread(ns, tool, threads, target, ts) {
  // Get the list of all the servers, sorted by free ram, but use 'home' last
  var hosts = Array.from(dns(ns).values()).
    filter((h) => h.name != 'home' && h.root).
    map((h) => h.name).
    sort((a, b) => ns.getServerMaxRam(a) - ns.getServerUsedRam(a) > ns.getServerMaxRam(b) - ns.getServerUsedRam(b))
  hosts.push("home")
  for (var h of hosts) {
    var max = ns.getServerMaxRam(h)
    if (h == "home") {
      max -= Math.max(buffer, max/2)
    }
    var t = Math.floor((max - ns.getServerUsedRam(h)) / 1.75, threads)
    if (t <= 0) {
      continue
    }
    // log(ns, "[%s] Starting %d threads of %s on %s", target, t, tool, h)
    if (ns.exec(tool, h, t, target, ts)) {
      ns.tprintf("Launched %d threads on %s", t, h)
    } else {
      ns.tprinf("Failed to run %s on %s", tool, h) 
      continue
    }
    threads -= t

    if (threads <= 0) { return }
  }
  ns.tprintf("Couldn't run %d threads", threads)
}

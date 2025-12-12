import { dns } from "@/hosts.js"
import { types } from "@/contracts.js"
import { info, toast } from "@/log.js"

var cashBuffer = 10e6
var minPserv = 256
/** @param {NS} ns */
export async function main(ns) {
  [
    "getServerMaxRam",
  ].forEach((i) => ns.disableLog(i))
  ns.ls("home", "/bak").forEach((f) => ns.rm(f, "home"))
  ns.ls("home", "/logs/*.txt").forEach((f) => ns.mv("home", f, "/bak/"+f))
  check(ns, "console.js", "console")
  check(ns, "syslog.js", "syslog")
  ns.run("g/tor.js", 1)
  ns.run("map.js", 1, "--silent")
  check(ns, "go2.js", "hack controller")
  check(ns, "ipvgo.js", "IPvGO player")

  while(true) {
    // Handle pserv
    pserv(ns)
    // Find contracts
    findContracts(ns)
    await ns.asleep(100)
    // Buy upgrades
    ns.run("g/upgrade.js", 1)
    await ns.asleep(100)
    // Buy programs
    ns.run("g/program.js", 1)
    await ns.asleep(100)
    // Join factions
    ns.run("g/factions.js", 1)
    await ns.asleep(100)
    // Update hosts file
    ns.run("map.js", 1, "--silent")
    ns.printf("Loop done: %s", Date())
    await ns.asleep(60000)
  }

}

/**
 * @param {NS} ns
 */
function findContracts(ns) {
  var hosts = dns(ns)
  var count = 0
  var solve = 0
  for (var h of hosts.values()) {
    if (h.name == "home") {
      continue
    }
    var cs = Array.from(h.files.filter((f) => f.endsWith(".cct")))
    for (var c of cs) {
      if (ns.ls(h.name).filter((f) => f == c).length == 0) {
        ns.printf("Can't find %s on %s, skipping.", c, h.name)
        continue
      }
      var t = ns.codingcontract.getContractType(c, h.name)
      if (types.has(t)) {
        info(ns, "Solving %s on %s (%s)", c, h.name, t)
        ns.run("contracts.js", 1, h.name, c, "--toast")
        solve++
      } else {
        count++
      }
    }
  }
  if (count > 0) {
    toast(ns, "%d contracts found, %d attempted", count, count+solve)
  }
}

/**
 * @param {NS} ns
 */
function pserv(ns) {
  var m = ns.getPlayer().money - cashBuffer
  // find larger pserv we can afford to buy with our budget
  if (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
    var size = minPserv
    while (ns.getPurchasedServerCost(size*2) < m) {
      size *= 2
    }
    var name = ns.purchaseServer("pserv", size)
    toast(ns, "Bought %s (%s @ $%s)", name, ns.formatRam(size), ns.formatNumber(ns.getPurchasedServerCost(size)))
    return
  }

  // Find server to upgrade
  for (var s of ns.getPurchasedServers().sort((a,b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b))) {
    var size = ns.getServerMaxRam(s)
    var orig = size
    while (ns.getPurchasedServerUpgradeCost(s, size*2) < m) {
      size *=2
    }
    if (size == orig) {
      continue
    }
    if (ns.upgradePurchasedServer(s, size)) {
      toast(ns, "Upgraded server from %s to %s", ns.formatRam(orig), ns.formatRam(size))
      break
    } else {
      ns.printf("Failed to upgrade %s to %s", s, ns.formatRam(size))
    }
  }
}

/**
 * @param {NS} ns
 * @param {String} fn
 * @param {String} name
 */
function check(ns, fn, name, ...args) {
  var ps = ns.ps("home")
  if (ps.filter((p) => p.filename == fn).length == 0) {
    toast(ns, "Starting %s", name)
    ns.run(fn, 1, ...args)
  }
}

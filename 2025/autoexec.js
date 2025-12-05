import { dns } from "@/hosts.js"
import { types } from "@/contracts.js"

var cashBuffer = 10e6
var minPserv = 256
var toasts = new Map()
/** @param {NS} ns */
export async function main(ns) {
  [
    "getServerMaxRam",
  ].forEach((i) => ns.disableLog(i))
  check(ns, "console.js", "console")
  ns.run("g/tor.js", 1)
  ns.run("map.js", 1, "--silent")
  check(ns, "go2.js", "hack controller")

  while(true) {
    // Handle pserv
    pserv(ns)
    // Find contracts
    findContracts(ns)
    // Buy upgrades
    ns.run("g/upgrade.js", 1)
    // Buy programs
    ns.run("g/program.js", 1)
    // Update hosts file
    ns.run("map.js", 1, "--silent")
    ns.printf("Loop done: %s", Date())
    await ns.asleep(60000)
  }

}

/**
 * @param {NS} ns
 */
function toast(ns, name, tmpl, ...args) {
  ns.printf(tmpl, ...args)
  if (!toasts.has(name) || toasts.get(name) < Date.now() - 60e3) {
    ns.toast(ns.sprintf(tmpl, ...args))
    toasts.set(name, Date.now())
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
        ns.printf("Solving %s on %s (%s)", c, h.name, t)
        ns.run("contracts.js", 1, h.name, c, "--toast")
        solve++
      } else {
        count++
      }
    }
  }
  if (count > 0) {
    toast(ns, "contract", "%d contracts found, %d attempted", count, count+solve)
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
    ns.printf("Bought %s (%s @ $%s)", name, ns.formatRam(size), ns.formatNumber(ns.getPurchasedServerCost(size)))
    if (name != "") {
      toast(ns, "newsrv", "Bought %s server", ns.formatRam(size))
    }
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
      toast(ns, "upserv", "Upgraded server from %s to %s", ns.formatRam(orig), ns.formatRam(size))
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
function check(ns, fn, name) {
  var ps = ns.ps("home")
  if (ps.filter((p) => p.filename == fn).length == 0) {
    toast(ns, "start", "Starting %s", name)
    ns.run(fn)
  }
}

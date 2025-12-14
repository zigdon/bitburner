import { dns } from "@/hosts.js"
import { types } from "@/contracts.js"
import { info, toast } from "@/log.js"

const config = "data/autoexec.json"
var cfg = {valid:false}
/** @param {NS} ns */
export async function main(ns) {
  [
    "getServerMaxRam",
  ].forEach((i) => ns.disableLog(i))
  ns.clearLog()
  ns.rm("data/wd.txt", "home")
  ns.ls("home", "/bak").forEach((f) => ns.rm(f, "home"))
  ns.ls("home", "/logs").filter(
    (f) => f.endsWith(".txt")
  ).forEach(
    (f) => ns.mv("home", f, "/bak/"+f)
  )
  cfg = loadCfg(ns, config)
  if (!cfg?.valid) {
    ns.tprintf("Failed to load config at startup")
    return
  }
  for (var p of cfg.run) {
    if (p.oneTime) {
      ns.run(p.name, 1, ...(p.args ?? []))
    } else {
      check(ns, p)
    }
  }

  if (cfg.pserv.disabled) {
    ns.toast("Server buying disabled", "warning")
  }
  while(true) {
    // Update config
    var next = loadCfg(ns, config)
    if (next.valid) {
      cfg = next
    }

    // Restart what we expect should be running.
    for (var p of cfg.run) {
      if (p.oneTime) {
        continue
      }
      check(ns, p)
      await ns.asleep(100)
    }

    // Handle pserv.
    if (cfg.loop.pserv) { pserv(ns) }
    // Find contracts.
    if (cfg.loop.contracts) { findContracts(ns) }
    await ns.asleep(100)

    ns.printf("Loop done: %s", Date())
    await ns.asleep(60000)
  }

}

function loadCfg(ns, name) {
  if (!ns.fileExists(name)) {
    ns.toast(ns.sprintf("%s not found", name), "error")
    return
  }
  var next = JSON.parse(ns.read(name))
  if (next?.valid) {
    ns.printf("new config: %j", next)
    return next
  }
  ns.toast(ns.sprintf("Error parsing %s", name), "error")
}

/**
 * @param {NS} ns
 */
function findContracts(ns) {
  var hosts = dns(ns)
  var count = 0
  for (var h of hosts.keys()) {
    if (h == "home") {
      continue
    }
    var cs = ns.ls(h).filter((f) => f.endsWith(".cct"))
    for (var c of cs) {
      info(ns, "Found contract %s on %s", c, h)
      ns.run("contracts.js", 1, h, c, "--toast")
      count++
    }
  }
  if (count > 0) {
    toast(ns, "%d contracts found", count)
  }
}

/**
 * @param {NS} ns
 */
function pserv(ns) {
  if (cfg.pserv.disabled) {
    ns.printf("Buying servers disabled")
    return
  }
  var m = ns.getPlayer().money - cfg.pserv.cashBuffer
  // find larger pserv we can afford to buy with our budget
  if (ns.getPurchasedServers().length < ns.getPurchasedServerLimit()) {
    var size = cfg.pserv.min
    while (ns.getPurchasedServerCost(size*2) < m) {
      size *= 2
    }
    var name = ns.purchaseServer("pserv", size)
    if (name != "") {
      toast(ns, "Bought %s (%s @ $%s)", name, ns.formatRam(size), ns.formatNumber(ns.getPurchasedServerCost(size)))
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
function check(ns, def) {
  ns.print(def)
  if (def.disabled) {
    ns.printf("%s disabled in loop config", def.name)
    return
  }
  if (ns.ps("home").filter((p) => p.filename == def.name).length == 0) {
    if (def.title) {
      toast(ns, "Starting %s", def.title)
    }
    ns.run(def.name, 1, ...(def.args ?? []))
  }
}

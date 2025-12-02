import { table } from "/table.js"
/** @param {NS} ns */
export async function main(ns) {
  var cmd = ns.args[0]
  if (cmd == "cat") {
    var data = []
    var size = 2
    var max = ns.getPurchasedServerMaxRam()
    var m = ns.getPlayer().money
    do {
      var cost = ns.getPurchasedServerCost(size)
      data.push([ns.formatRam(size), ["$" + ns.formatNumber(cost), cost > m ? "red" : false]])
      size *= 2
    } while (size <= max)
    ns.tprint(table(ns, ["Size", "Cost"], data))
    return
  } else if (cmd == "buy") {
    var size = ns.args[1]
    if (size == undefined || size == "auto") {
      size = ns.getPurchasedServerMaxRam()
      while (size > 32 && ns.getPurchasedServerCost(size) > ns.getPlayer().money) {
        size /= 2
      }
    }
    ns.tprintf("Bought new server %s with %s for $%s",
      ns.purchaseServer("pserv", size), ns.formatRam(size), ns.formatNumber(ns.getPurchasedServerCost(size)))
    ns.run("map.js", 1, "--silent")
    return
  } else if (cmd == "upgrade") {
    var targets = ns.args.slice(1)
    var data = []
    if (targets[0] == undefined) {
      targets = ns.getPurchasedServers()
    } else if (targets[0] == "auto") {
      targets = [ns.getPurchasedServers().sort(
        (a, b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b))[0]]
    }
    for (var s of targets) {
      var cur = ns.getServerMaxRam(s)
      var upgrade = cur
      var max = ns.getPurchasedServerMaxRam()
      while (upgrade * 2 <= max && ns.getPurchasedServerUpgradeCost(s, upgrade * 2) <= ns.getPlayer().money) {
        upgrade *= 2
      }
      if (cur != upgrade) {
        data.push([s, ns.formatRam(cur) + "->" + ns.formatRam(upgrade), "$" + ns.formatNumber(ns.getPurchasedServerUpgradeCost(s, upgrade)), upgrade])
      } else {
        data.push([s, ns.formatRam(cur), "N/A"])
      }
    }
    ns.tprint(table(ns, ["Server", "RAM", "Cost"], data))
    if (targets.length > 1) {
      var target = await ns.prompt("Select server to upgrade", { type: "select", choices: ["abort", ...targets] })
      if (!targets.includes(target)) {
        ns.tprint("Aborted!")
        return
      }
      targets = [target]
    }
    var details = data.filter((l) => l[0] == targets[0])[0]
    var cost = ns.getPurchasedServerUpgradeCost(details[0], details[3])
    if (ns.upgradePurchasedServer(details[0], details[3])) {
      ns.tprintf(
        "Upgraded %s to %s for $%s",
        details[0],
        ns.formatRam(details[3]),
        ns.formatNumber(cost)
      )
      ns.run("map.js", 1, "--silent")
    } else {
      ns.tprint("Upgrade failed.")
    }
    return
  } else if (cmd == "list") {
    var data = []
    for (var s of ns.getPurchasedServers()) {
      var svr = ns.getServer(s)
      data.push([
        s,
        ns.formatRam(svr.ramUsed) + "/" + ns.formatRam(svr.maxRam),
        "$" + ns.formatNumber(ns.getPurchasedServerUpgradeCost(s, svr.maxRam * 2))
      ])
    }
    ns.tprint(table(ns, ["Name", "RAM", "Upgrade Cost"], data))
    return
  }

  ns.tprint("Unimplemented")

  /*
    ns.getPurchasedServerLimit()
    ns.getPurchasedServers()
    ns.getPurchasedServerUpgradeCost()
    ns.upgradePurchasedServer()
    ns.renamePurchasedServer()
  */
}

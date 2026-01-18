import {table} from "@/table.js"
/** @param {NS} ns */
export async function main(ns) {
  var cmd = ns.args[0]
  switch (cmd) {
    case "stats":
      stats(ns)
      break
    case "buy":
      buy(ns, ns.args)
      break
    case "upgrade":
      upgrade(ns, ns.args)
      break
    case "auto":
      await auto(ns)
      break
    default:
      ns.tprint("Unknown command")
  }
}

async function auto(ns) {
  var hn = ns.hacknet

  // Buy all the nodes
  while (true) {
    ns.print("Buying hacknet nodes...")
    await ns.asleep(60000)
    var cost = hn.getPurchaseNodeCost()
    if (cost < 0.1 * ns.getPlayer().money) {
      hn.purchaseNode()
      ns.toast("Bought new hacknet node", "info")
    }
    if (cost == Infinity) {
      ns.toast("Bought all hacknet nodes")
      break
    }
  }

  // Upgrade all the nodes
  while (true) {
    ns.print("Upgrading hacknet nodes...")
    await ns.asleep(60000)
    var up = upgrade(ns, ns.getPlayer().money * 0.01, true)
    if (up > 0) {
      ns.toast(ns.sprintf("Upgraded %d hacknet nodes", up), "info")
    }
  }

  // Literally profit
}

function upgrade(ns, args) {
  var cost = args[1]
  var silent = args[2] || false
  if (cost.endsWith("k")) {
    cost = cost.substring(0,cost.length-1) * 1000
  } else if (cost.endsWith("m")) {
    cost = cost.substring(0,cost.length-1) * 1000*1000
  } else if (cost.endsWith("b")) {
    cost = cost.substring(0,cost.length-1) * 1000*1000*1000
  } else if (cost.endsWith("t")) {
    cost = cost.substring(0,cost.length-1) * 1000*1000*1000*1000
  }
  var hn = ns.hacknet
  silent || ns.tprintf("Spending $%s on upgrades", ns.formatNumber(cost))
  var totals = {cores:0, ram:0, levels:0, nodes:Array(hn.numNodes()).fill(0)}

  while (cost > 0) {
    var up = {type:"level", id:0, cost:hn.getLevelUpgradeCost(0)}
    for (var n=0; n<hn.numNodes(); n++) {
      if (hn.getLevelUpgradeCost(n) < up.cost) {
        up.cost = hn.getLevelUpgradeCost(n)
        up.id = n
        up.type = "level"
      }
      if (hn.getRamUpgradeCost(n) < up.cost) {
        up.cost = hn.getRamUpgradeCost(n)
        up.id = n
        up.type = "ram"
      }
      if (hn.getCoreUpgradeCost(n) < up.cost) {
        up.cost = hn.getCoreUpgradeCost(n)
        up.id = n
        up.type = "core"
      }
    }
    if (up.cost > cost) {
      silent || ns.tprintf("Upgrading %s on #%d will cost $%s", up.type, up.id, ns.formatNumber(up.cost))
      break
    }
    silent || ns.tprintf("Upgrading %s on #%d for $%s", up.type, up.id, ns.formatNumber(up.cost))
    var fn
    switch (up.type) {
      case "level":
        fn = hn.upgradeLevel
        totals.levels++
        break
      case "ram":
        fn = hn.upgradeRam
        totals.ram++
        break
      case "core":
        fn = hn.upgradeCore
        totals.cores++
        break
      default:
        ns.tprint("Uh, what: " + up.type)
        break
    }
    if (!fn(up.id)) {
      silent || ns.tprint("Upgrade failed.")
      break
    }
    totals.nodes[up.id]++
    cost -= up.cost
  }
  silent || ns.tprintf("Upgrades done: %j", totals)
  return totals.nodes.filter((n) => n > 0).length
}

function buy(ns, args) {
  var n = args[1] || 1
  ns.tprintf("Trying to buy %d nodes", n)
  for (; n>0; n--) {
    var id = ns.hacknet.purchaseNode()
    if (id > 0) {
      ns.tprintf("Bought node: %d", id)
    } else {
      ns.tprint("Failed to buy node.")
      break
    }
  }
}

function stats(ns) {
  var hn = ns.hacknet
  var n = hn.numNodes()
  ns.tprintf("%d/%d nodes:", n, hn.maxNumNodes())
  var data = []
  var prod = {rate:0, total:0}
  for (var i=0; i<n; i++) {
    var s = hn.getNodeStats(i)
    prod.rate += s.production
    prod.total += s.totalProduction
    data.push([
      s.level,
      s.ram,
      s.cores,
      "$"+ns.formatNumber(s.production),
      ns.tFormat(s.timeOnline*1000),
      "$"+ns.formatNumber(s.totalProduction),
    ])
  }
  ns.tprint(table(ns, ["Level", "RAM", "Cores", "Rate", "Time", "Total"], data))
  ns.tprintf("Totals: $%s/sec, $%s", ns.formatNumber(prod.rate), ns.formatNumber(prod.total))
}

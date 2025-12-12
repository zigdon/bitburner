import { dns } from "@/hosts.js"
import { table } from "@/table.js"
import { critical, warning, info, debug } from "@/log.js"
import { colors } from "@/colors.js"

var buffer = 100

/** @param {NS} ns */
export async function main(ns) {
  [
    "getServerMaxRam",
    "getServerUsedRam",
    "getServerGrowth",
    "getServerMinSecurityLevel",
    "getServerMoneyAvailable",
    "getServerMaxMoney",
  ].forEach((m) => ns.disableLog(m))
  ns.clearLog()
  ns.clearPort(20)

  // When exiting kill all pending messages
  ns.atExit(() => {
    ns.ps().forEach((p) => 
      p.args[0] == "bin/send.js" && p.args[1] == "20" && ns.kill(p.pid)
    )
  })

  // read available servers
  var started = new Map()
  // pick target
  // @ignore-infinite
  while (true) {
    var hosts = dns(ns)
  
    // copy scripts
    const tools = ["bin/hack.js", "bin/weaken.js", "bin/grow.js", "bin/colors.js"]
    for (var h of hosts.keys()) {
      ns.scp(tools, h)
    }

    // Check if any of our started jobs timed out
    while (ns.peek(20) != "NULL PORT DATA") {
      var ended = ns.readPort(20)
      debug(ns, "[%s] ended", ended)
      started.delete(ended)
    }
    // find out how many threads we can run
    var capacity = checkCapacity(ns)
    if (capacity < 50) {
      ns.print("Waiting for capacity")
      await ns.asleep(5000)
      continue
    }
    debug(ns, "Can run %d threads total", capacity)
  
    var playerHack = ns.getPlayer().skills.hacking
    var opts = Array.from(hosts.keys()).filter((n) => {
      var h = hosts.get(n)
      return !started.has(n) && h.root && h.hack <= playerHack && h.max > 0
    })
    if (opts.length == 0) {
      debug(ns, "*** No more targets")
      await ns.nextPortWrite(20)
      continue
    }
    var fn = function (a) {
      let h = hosts.get(a)
      return h.max * ns.hackAnalyzeChance(a) / 1000 + ns.getServerGrowth(a) * 10
    }
    opts.sort((a, b) => fn(b) - fn(a))
  
    var data = []
    for (var n of opts) {
      var h = hosts.get(n)
      data.push([h.name, ns.formatNumber(h.max), h.hack, fn(n)])
    }
    ns.print(table(ns, ["Name", "Max", "Hack", "fn"], data))
  
    var target = hosts.get(opts[0])
    var tName = target.name
    debug(ns, "Selected %s: %d%% of %s @ %s", target.name, 100 * target.cur / target.max, ns.formatNumber(target.max), target.hack)
  
    // figure out number of threads needed to weaken
    var deltaSec = ns.getServerSecurityLevel(tName) - ns.getServerMinSecurityLevel(tName)
    var delay = 0
    if (deltaSec > ns.getServerMinSecurityLevel(tName) * 0.05) {
      var weakenThreads = countWT(ns, deltaSec)
      var wt = Math.min(weakenThreads, capacity)
      debug(ns, "Need %d/%d threads to weaken from %d to %d",
        weakenThreads, capacity, ns.getServerSecurityLevel(tName), ns.getServerMinSecurityLevel(tName))
      spread(ns, "bin/weaken.js", wt, tName, 0)
      capacity -= wt
      delay = ns.getWeakenTime(tName) + 25
    }
  
    // figure out number of threads for max hack
    var growThreads = countGT(ns, tName)
    if (delay == 0 && growThreads > 1 && capacity > 0) {
      var gt = Math.min(capacity, growThreads)
      debug(ns, "Need %d/%d threads to grow from %s to %s",
        growThreads, capacity, ns.formatNumber(ns.getServerMoneyAvailable(tName)), ns.formatNumber(ns.getServerMaxMoney(tName)))
      spread(ns, "bin/grow.js", gt, tName, delay)
      capacity -= gt
      delay = ns.getGrowTime(tName) + 25
    }
  
    if (delay == 0) {
      // start HWGW batch
      var plan = findPlan(ns, tName, capacity)
      delay = batch(ns, tName, plan)
    }
  
    started.set(tName, true)
    // Schedule clearing the mark
    ns.run("bin/send.js", 1, 20, delay, tName)
  }
}

/**
 * @param {NS} ns
 * @param {Number} delta
 * @return Number
 */
function countWT(ns, delta) {
  var w = 1
  while (ns.weakenAnalyze(w) < delta) {
    w++
  }
  return w
}

/**
 * @param {NS} ns
 * @param {String} target
 * @param {Number} start
 * @return Number
 */
function countGT(ns, target, start) {
  start = start == undefined ? ns.getServerMoneyAvailable(target) : start
  var ratio = Math.max(1, ns.getServerMaxMoney(target) / (1 + start))
  return Math.ceil(ns.growthAnalyze(target, ratio))
}

/**
 * @param {NS} ns
 * @return Number
 */
function checkCapacity(ns) {
  var hosts = dns(ns)
  var t = 0
  for (var h of hosts.values()) {
    if (!h.root) {
      continue
    }
    t += Math.floor((ns.getServerMaxRam(h.name) - ns.getServerUsedRam(h.name)) / 1.75)
  }

  return t
}

/**
 * @param {NS} ns
 * @param {String} tName
 * @param {Number} capacity
 * @return Object
 */
function findPlan(ns, tName, capacity) {
  // At max, we want to run however many threads we can to hack 100% of the value on each batch
  var maxV = ns.getServerMoneyAvailable(tName)
  var maxH = ns.hackAnalyzeThreads(tName, maxV)
  // And weaken back to 0
  var secH = ns.hackAnalyzeSecurity(maxH, tName)
  var maxWH = countWT(ns, secH)
  // And grow back to max
  var maxG = countGT(ns, tName, 0)
  var secG = ns.growthAnalyzeSecurity(maxG, tName)
  // And weaken back to 0 again
  var maxWG = countWT(ns, secG)

  // If we have enough capacity, just return that
  var total = maxH + maxWH + maxG + maxWG
  var ret = {}
  if (capacity >= total) {
    debug(ns, "[%s] Hacking at full capacity: (%d/%d)", tName, total, capacity)
    ret = { h: maxH, wh: maxWH, g: maxG, wg: maxWG }
  } else {
    var ratio = capacity / total
    ret = {
      h: Math.floor(ratio * maxH),
      wh: Math.floor(ratio * maxWH),
      g: Math.floor(ratio * maxG),
      wg: Math.floor(ratio * maxWG),
    }
    debug(ns, "[%s] Hacking at %d%% capacity:", tName, 100 * ratio)
  }

  debug(ns, "[%s] %d/%d/%d/%d", tName, ret.h, ret.wh, ret.g, ret.wg)
  return ret
}

/**
 * @param {NS} ns
 * @param {String} tName
 * @param {Object} plan
 * @return Number
 */
function batch(ns, tName, plan) {
  var total = plan.h + plan.wh + plan.g + plan.wg
  var ts = Math.max(
    ns.getWeakenTime(tName),
    ns.getHackTime(tName),
    ns.getWeakenTime(tName)
  )
  debug(ns, "[%s] Starting batch with %d threads (%d)", tName, total, ts / 1000)
  // HWGW
  spread(ns, "bin/hack.js", plan.h, tName, ts-100)
  spread(ns, "bin/weaken.js", plan.wh, tName, ts-75)
  spread(ns, "bin/grow.js", plan.g, tName, ts-50)
  spread(ns, "bin/weaken.js", plan.wg, tName, ts-25)

  return ts
}

/**
 * @param {NS} ns
 * @param {String} tool
 * @param {Number} threads
 * @param {String} target
 * @param {Number} ts
 */
function spread(ns, tool, threads, target, ts) {
  // Get the list of all the servers, sorted by free ram, but use 'home' last
  var hosts = Array.from(dns(ns).values()).
    filter((h) => h.name != 'home' && h.root).
    map((h) => h.name).
    sort((a, b) => ns.getServerMaxRam(a) - ns.getServerUsedRam(a) > ns.getServerMaxRam(b) - ns.getServerUsedRam(b))
  hosts.push("home")
  for (var h of hosts) {
    var max = ns.getServerMaxRam(h)
    if (h == "home") {
      max -= buffer
    }
    var t = Math.floor((max - ns.getServerUsedRam(h)) / 1.75, threads)
    if (t <= 0) {
      continue
    }
    // log(ns, "[%s] Starting %d threads of %s on %s", target, t, tool, h)
    if (!ns.exec(tool, h, t, target, ts)) {
      warning(ns, "[%s] %sFailed to run %s on %s%s", target, colors["red"], tool, h, colors["reset"]) 
      continue
    }
    threads -= t

    if (threads <= 0) { return }
  }
}

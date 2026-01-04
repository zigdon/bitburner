import { dns } from "@/hosts.js"
import { table } from "@/table.js"
import { warning, info, debug } from "@/log.js"
import { colors } from "@/colors.js"

const buffer = 300
const minThreadsForBatch = 50

/** @param {NS} ns */
export async function main(ns) {
  [
    "asleep",
    "exec",
    "getServerGrowth",
    "getServerMaxMoney",
    "getServerMaxRam",
    "getServerMinSecurityLevel",
    "getServerMoneyAvailable",
    "getServerSecurityLevel",
    "getServerUsedRam",
    "scp",
  ].forEach((m) => ns.disableLog(m))
  ns.clearLog()

  var started = new Map()
  started.clear()
  var waitingForCapacity = false
  // read available servers
  // pick target
  // @ignore-infinite
  while (true) {
    var hosts = dns(ns)
    await ns.asleep(1)
  
    // copy scripts
    const tools = ["bin/hack.js", "bin/weaken.js", "bin/grow.js", "colors.js", "bin/send.js"]
    for (var h of hosts.keys()) {
      ns.scp(tools, h)
    }

    // Check if any of our started jobs timed out
    for (var [name, timeout] of Object.entries(started)) {
      if (timeout > Date.now()) {
        ns.print("%s ended after %s", name, ns.tFormat(timeout, true))
        started.delete(name)
      }
    }

    // find out how many threads we can run
    var capacity = checkCapacity(ns)
    if (capacity < minThreadsForBatch) {
      if (!waitingForCapacity) 
        ns.printf("%s: Waiting for capacity", new Date().toLocaleTimeString())
      waitingForCapacity = true
      await ns.asleep(5000)
      continue
    }
    waitingForCapacity = false
    await debug(ns, "Can run %d threads total", capacity)
  
    var playerHack = ns.getPlayer().skills.hacking
    var opts = Array.from(hosts.keys()).filter((n) => {
      var h = hosts.get(n)
      if (h.max == 0 || !h.root || h.hack > playerHack) {
        return false
      }
      if (!started.has(n)) {
        return true
      }
      if (started.get(n) > Date.now()) {
        return false
      }
      return true
    })
    if (opts.length == 0) {
      var nextTimes = Array.from(started.values())
      var next = Math.min(...nextTimes)-Date.now()
      await debug(
        ns, "*** No more targets (%d in progress, next ends in %s)",
        nextTimes.length, ns.tFormat(next > 0 ? next : 0, true)
      )
      await weakenNext(ns, capacity, started)
      if (next > 0) {
        await ns.asleep(next+1)
      } else {
        await ns.asleep(5000)
      }
      continue
    }
    var fn = function (a) {
      let h = hosts.get(a)
      return h.max * ns.hackAnalyzeChance(a) / 1000 + ns.getServerGrowth(a) * 100
    }
    opts.sort((a, b) => fn(b) - fn(a))
  
    /* 
    var data = []
    for (var n of opts) {
      var h = hosts.get(n)
      var loot = ns.sprintf("$%s/$%s",
        ns.formatNumber(ns.getServerMoneyAvailable(h.name)),
        ns.formatNumber(ns.getServerMaxMoney(h.name)))
      var sec = ns.sprintf("%.2f/%.2f",
        ns.getServerSecurityLevel(h.name),
        ns.getServerMinSecurityLevel(h.name))
      data.push([h.name, loot, sec, h.hack, fn(n)])
    }
    ns.print(table(ns, ["Name", "Money", "Security", "Hack", "fn"], data))
    */
  
    var target = hosts.get(opts[0])
    var tName = target.name
    await debug(ns, "Selected %s: %d%% of %s @ %s", target.name, 100 * target.cur / target.max, ns.formatNumber(target.max), target.hack)
  
    // figure out number of threads needed to weaken
    var deltaSec = ns.getServerSecurityLevel(tName) - ns.getServerMinSecurityLevel(tName)
    var delay = 0
    if (deltaSec > ns.getServerMinSecurityLevel(tName) * 0.05) {
      var weakenThreads = countWT(ns, deltaSec)
      var wt = Math.min(weakenThreads, capacity)
      await debug(ns, "Need %d/%d threads to weaken from %d to %d",
        weakenThreads, capacity, ns.getServerSecurityLevel(tName), ns.getServerMinSecurityLevel(tName))
      var launched = await spread(ns, "bin/weaken.js", wt, tName, 0)
      reportStarted(ns, launched)
      capacity -= wt
      delay = ns.getWeakenTime(tName) + 25
    }
  
    // figure out number of threads for max hack
    var growThreads = countGT(ns, tName)
    if (delay == 0 && growThreads > 1 && capacity > 0) {
      var gt = Math.min(capacity, growThreads)
      await debug(ns, "Need %d/%d threads to grow from %s to %s",
        growThreads, capacity, ns.formatNumber(ns.getServerMoneyAvailable(tName)), ns.formatNumber(ns.getServerMaxMoney(tName)))
      var launched = await spread(ns, "bin/grow.js", gt, tName, delay)
      reportStarted(ns, launched)
      capacity -= gt
      delay = ns.getGrowTime(tName) + 25
    }
  
    if (delay == 0) {
      // start HWGW batch
      var plan = await findPlan(ns, tName, capacity)
      delay = await batch(ns, tName, plan)
    }
  
    await debug(ns, "%s: Waiting %s for %s", new Date().toLocaleTimeString(), ns.tFormat(delay, true), tName)
    started.set(tName, Date.now()+delay)
  }
}

/**
 * @param {NS} ns
 * @param {Number} capacity
 * @param {Map} started
 */
async function weakenNext(ns, capacity, started) {
  // Find the next server we have root on, but not hacking yet, and start
  // weakening it.
  let hosts = dns(ns)
  for (let h of Array.from(hosts.values()).sort((a,b) => a.hack - b.hack)) {
    if (!h.root) continue
    if (started.has(h.name)) continue
    let srv = ns.getServer(h.name)
    if (srv.hackDifficulty <= srv.minDifficulty) continue
    let delta = srv.hackDifficulty - srv.minDifficulty
    let t = Math.min(countWT(ns, delta), capacity)
    if (t > 0) {
      await debug(ns, "%s: Bonus weakening with %d threads", h.name, t)
      let launched = await spread(ns, "bin/weaken.js", t, h.name, 0)
      reportStarted(ns, launched)
      capacity -= t
    }

    if (capacity <= 0) return
  }
  await debug(ns, "No more bonus targets, %d capacity unused", capacity)
}

/**
 * @param {NS} ns
 * @param {Number} delta
 * @return Number
 */
function countWT(ns, delta) {
  var w = 1
  while (ns.weakenAnalyze(w, 1) < delta) {
    w++
  }
  return w
}

/**
 * @param {NS} ns
 */
function hasFormulas(ns) {
  return ns.fileExists("Formulas.exe", "home")
}

/**
 * @param {NS} ns
 * @param {String} target
 * @param {Number} startCash
 * @param {Number} startSec
 * @return Number
 */
function countGT(ns, target, startCash, startSec) {
  startCash ??= ns.getServerMoneyAvailable(target)
  if (hasFormulas(ns)) {
    var srv = ns.getServer(target)
    srv.moneyAvailable = startCash
    if (startSec != undefined) srv.hackDifficulty = startSec
    return ns.formulas.hacking.growThreads(srv, ns.getPlayer(), srv.moneyMax, 1)
  } else {
    var ratio = Math.max(1, ns.getServerMaxMoney(target) / (1 + start))
    return Math.ceil(ns.growthAnalyze(target, ratio, 1))
  }
}

/**
 * @param {NS} ns
 * @return Number
 */
function checkCapacity(ns) {
  var hosts = dns(ns)
  var t = 0
  var found = []
  for (var h of hosts.values()) {
    if (!h.root) continue
    var save = 0
    if (h.name == "home") {
      save = Math.min(buffer, ns.getServerMaxRam("home")/2)
    }
    var avail = Math.floor(
      (ns.getServerMaxRam(h.name) - ns.getServerUsedRam(h.name) - save) / 1.75
    )
    t += avail
    if (avail > 0) found.push([h.name, avail])
  }

  if (found.length > 0 && t >= minThreadsForBatch) ns.printf(
    "%s: Found capacity:%s", new Date().toLocaleTimeString(),
    table(ns, ["Host", "Threads"], found))

  return t
}

/**
 * @param {NS} ns
 * @param {String} tName
 * @param {Number} capacity
 * @return Object
 */
async function findPlan(ns, tName, capacity) {
  // At max, we want to run however many threads we can to hack 100% of the value on each batch
  var maxV = ns.getServerMoneyAvailable(tName)
  var maxH = Math.ceil(ns.hackAnalyzeThreads(tName, maxV))
  // And weaken back to 0
  var secH = ns.hackAnalyzeSecurity(maxH, tName)
  var maxWH = countWT(ns, secH)
  // And grow back to max
  var maxG = countGT(ns, tName, 0, ns.getServerMinSecurityLevel(tName))
  var secG = ns.growthAnalyzeSecurity(maxG, tName, 1)
  // And weaken back to 0 again
  var maxWG = countWT(ns, secG+ns.getServerMinSecurityLevel(tName))

  // If we have enough capacity, just return that
  var total = maxH + maxWH + maxG + maxWG
  var ret = {}
  if (capacity >= total) {
    await debug(ns, "[%s] Hacking at full capacity: (%d/%d)",
      tName, total, capacity)
    ret = { h: maxH, wh: maxWH, g: maxG, wg: maxWG }
  } else {
    var ratio = capacity / total
    ret = {
      h: Math.floor(ratio * maxH),
      wh: Math.floor(ratio * maxWH),
      g: Math.floor(ratio * maxG),
      wg: Math.floor(ratio * maxWG),
    }
    await debug(ns, "[%s] Hacking at %d%% capacity:", tName, 100 * ratio)
  }

  await debug(ns, "[%s] %f/%f/%f/%f", tName, ret.h, ret.wh, ret.g, ret.wg)
  return ret
}

/**
 * @param {NS} ns
 * @param {String} tName
 * @param {Object} plan
 * @return Number
 */
async function batch(ns, tName, plan) {
  var total = plan.h + plan.wh + plan.g + plan.wg
  var ht = ns.getHackTime(tName)
  var gt = ns.getGrowTime(tName)
  var wt1 = ns.getWeakenTime(tName)
  var wt2 = ns.getWeakenTime(tName)

  // If we have formulas, we can do better in figuring out the times.
  if (hasFormulas(ns)) {
    await debug(ns, "[%s] Using formulas to calculate batch timing", tName)
    let p = ns.getPlayer()
    var srv = ns.getServer(tName)
    // Current hack time
    ht = ns.formulas.hacking.hackTime(srv, p)
    srv.moneyAvailable = 0
    // Weaken time once the hack is done
    srv.hackDifficulty += ns.hackAnalyzeSecurity(plan.h, tName)
    wt1 = ns.formulas.hacking.weakenTime(srv, p)
    // Grow time once back to min security
    srv.hackDifficulty = srv.minDifficulty
    gt = ns.formulas.hacking.growTime(srv, p)
    // Weaken time once the grow is done (optimistically, assuming all threads
    // are on the same server)
    srv.moneyAvailable = ns.formulas.hacking.growAmount(srv, p, plan.g, 1)
    wt2 = ns.formulas.hacking.weakenTime(srv, p)
  }

  var ts = Math.max(ht, gt, wt1, wt2)

  await debug(ns, "[%s] Starting batch with %d threads (%s)",
    tName, total, ns.tFormat(ts, true))

  // HWGW
  var launched = []
  launched.push(...await spread(
    ns, "bin/hack.js", plan.h, tName, ts-ht, Date.now()))
  launched.push(...await spread(
    ns, "bin/weaken.js", plan.wh, tName, ts-wt1+5, Date.now()))
  launched.push(...await spread(
    ns, "bin/grow.js", plan.g, tName, ts-gt+10, Date.now()))
  launched.push(...await spread(
    ns, "bin/weaken.js", plan.wg, tName, ts-wt2+15, Date.now()))
  reportStarted(ns, launched)
  var events = [
    [0, "start", ""],
    [ts-ht, "start hack", plan.h],
    [ts-wt1+5, "start weaken (hack)", plan.wh],
    [ts-gt+10, "start grow", plan.g],
    [ts-wt2+15, "start weaken (grow)", plan.wg],
    [ts, "end hack", ""],
    [ts+5, "end weaken (hack)", ""],
    [ts+10, "end grow", ""],
    [ts+15, "end weaken (grow)", ""],
  ].sort((a,b) => a[0] - b[0]).map((l) => [ns.tFormat(l[0], true), l[1], l[2]])

  await debug(ns, table(ns, ["Time", "Event", "Threads"], events))

  return ts
}

/*
 * @param {NS} ns
 * @param {[string, string, number]} launched
 */
function reportStarted(ns, launched) {
  ns.print(table(ns, ["Host", "Tool", "Threads"], launched))
}

/**
 * @param {NS} ns
 * @param {String} tool
 * @param {Number} threads
 * @param {String} target
 * @param {Number} ts
 * @return [[host, tool, threads]]
 */
async function spread(ns, tool, threads, target, ts) {
  // Get the list of all the servers, sorted by free ram
  var launched = []
  var hosts = Array.from(dns(ns).values()).
    filter((h) => h.name != 'home' && h.root).
    map((h) => h.name).
    sort((a, b) => (ns.getServerMaxRam(a) - ns.getServerUsedRam(a)) - (ns.getServerMaxRam(b) - ns.getServerUsedRam(b)))
  // Weaken and Hack don't care about splitting across many hosts, so starting
  // from the least available ram makes sense. For Grow, we want to run as many
  // threads as possible at once, so reverse the sorting.
  if (tool == "bin/grow.js") hosts.reverse()

  // Always start threads on home last.
  hosts.push("home")
  for (var h of hosts) {
    var max = ns.getServerMaxRam(h)
    if (h == "home") {
      max -= Math.min(buffer, max/2)
    }
    var t = Math.min(Math.floor((max - ns.getServerUsedRam(h)) / 1.75), threads)
    if (t != Math.floor(t)) {
      await warning(
        ns, "[%s] Fractional threads will be rounded up: %.4f", target, t)
      t = Math.ceil(t)
    }
    if (t <= 0) {
      continue
    }
    // log(ns, "[%s] Starting %d threads of %s on %s", target, t, tool, h)
    if (!ns.exec(tool, h, t, target, ts)) {
      await warning(ns, "[%s] *** Failed to run %d threads of %s on %s", target, t, tool, h) 
      continue
    }
    launched.push([h, tool, t])
    threads -= t

    if (threads <= 0) break
  }
  if (threads > 0) {
    await info(ns, "[%s] *** Couldn't launch %d %s threads", target, threads, tool)
  }
  return launched
}

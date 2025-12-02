import { colors } from "/colors.js"
import { log } from "/log.js"

/** @param {NS} ns */
export async function main(ns) {
  var host = ns.args[0]
  var target = ns.args[1]

  while (true) {
    ns.scp(["hack.js", "grow.js", "weaken.js", "colors.js"], host)
    // Weaken to min
    var maxVal = ns.getServerMaxMoney(target)
    var min = ns.getServerMinSecurityLevel(target)
    var cur = ns.getServerSecurityLevel(target)
    var maxThreads = fitThreads(ns, host, target)
    if (maxThreads < 4) {
      await ns.asleep(1000)
      continue
    }
    // figure out how many threads we need to use to weaken
    var t = 1
    for (t = 1; t < maxThreads; t++) {
      if (ns.weakenAnalyze(t) >= cur - min) {
        break
      }
    }
    log(ns, "[%s->%s] max threads: %d", host, target, maxThreads)

    var curVal = ns.getServerMoneyAvailable(target)
    while (min * 1.1 < cur || curVal < maxVal * 0.95) {
      while (min * 1.1 < cur) {
        var prep_ms = ns.getWeakenTime(target)
        log(ns, "[%s->%s] Weakening (%.3f > %f) with %d threads (%.2f)", host, target, cur, min, t, prep_ms / 1000)
        var pid = ns.exec("weaken.js", host, t, target, 0)
        if (pid > 0) {
          await ns.asleep(prep_ms)
        } else {
          await ns.asleep(5000)
        }
        cur = ns.getServerSecurityLevel(target)
      }

      if (curVal < maxVal * 0.95) {
        // figure out how many threads we need
        var need = Math.ceil(ns.growthAnalyze(target, maxVal / curVal))
        log(ns, "[%s->%s] Need %d threads to grow by %.3f", host, target, need, maxVal / curVal)
        maxThreads = fitThreads(ns, host, target)
        while (maxThreads < 4) {
          await ns.asleep(1000)
          maxThreads = fitThreads(ns, host, target)
        }
        t = Math.min(need, maxThreads)

        var prep_ms = ns.getGrowTime(target)
        log(ns, "[%s->%s] Growing (%s < %s) with %d threads (%.2f)", host, target, ns.formatNumber(curVal), ns.formatNumber(maxVal), t, prep_ms / 1000)
        var pid = ns.exec("grow.js", host, t, target, 0)
        if (pid > 0) {
          await ns.asleep(prep_ms)
        } else {
          await ns.asleep(5000)
        }

        curVal = ns.getServerMoneyAvailable(target)
      }
      cur = ns.getServerSecurityLevel(target)
    }

    var grow_ms = ns.getGrowTime(target)
    var hack_ms = ns.getHackTime(target)
    var weak_ms = ns.getWeakenTime(target)
    var ts = Math.max(grow_ms, hack_ms, weak_ms) + 0.1
    maxThreads = fitThreads(ns, host, target)
    while (maxThreads < 4) {
      await ns.asleep(1000)
      maxThreads = fitThreads(ns, host, target)
    }
    log(ns, "[%s->%s] Starting batch with %d threads (%d)", host, target, maxThreads, ts / 1000)
    // HWGW
    ns.exec("hack.js", host, maxThreads / 4, target, ts - 100) ||
      log(ns, "[%s-%s] %sFailed to run hack%s", host, target, colors["red"], colors["reset"])
    ns.exec("weaken.js", host, maxThreads / 4, target, ts - 75) ||
      log(ns, "[%s-%s] %sFailed to run weaken1%s", host, target, colors["red"], colors["reset"])
    ns.exec("grow.js", host, maxThreads / 4, target, ts - 50) ||
      log(ns, "[%s-%s] %sFailed to run grow%s", host, target, colors["red"], colors["reset"])
    ns.exec("weaken.js", host, maxThreads / 4, target, ts - 25) ||
      log(ns, "[%s-%s] %sFailed to run weaken2%s", host, target, colors["red"], colors["reset"])

    await ns.asleep(ts)
  }
}

export function autocomplete(data, args) {
  return [...data.servers];
}

/** @param {NS} ns
 *  @param {String} host
 *  @param {String} target
 *  @return {Number}
 */
function fitThreads(ns, host, target) {
  var mem = ns.getServerMaxRam(host) - ns.getServerUsedRam(host)
  var maxThreads = Math.floor(mem / 1.75 / 4) * 4
  if (maxThreads < 4) {
    log(ns, "[%s->%s] Not enough memory to run, waiting...", host, target)
    return 0
  }
  return maxThreads
}

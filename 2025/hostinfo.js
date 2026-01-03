import { table } from "@/table.js"
/**
 * @param {NS} ns
 * @param {name} string
 */
export async function main(ns) {
  let name = ns.args[0]
  let data = ns.getServer(name)
  let p = ns.getPlayer()
  let wt = countWT(ns, name)
  let gt = countGT(ns, name) 
  let srv = ns.getServer(name)
  let out = [
    ["Root", data.backdoorInstalled ? "Backdoored" : data.hasAdminRights ? "Root" : "N/A"],
    ["RAM", ns.sprintf("%s/%s", ns.formatRam(data.ramUsed), ns.formatRam(data.maxRam))],
    ["Security", ns.sprintf("Cur: %.2f, Min: %.2f, Base: %.2f", data.hackDifficulty, data.minDifficulty, data.baseDifficulty)],
    ["Money", ns.sprintf("$%s/$%s", ns.formatNumber(data.moneyAvailable), ns.formatNumber(data.moneyMax))],
    ["Weaken", wt],
    ["WeakenTime", ns.tFormat(ns.getWeakenTime(name))],
    ["WeakenDelta", wt == 0 ? 0 : ns.weakenAnalyze(wt)],
    ["Grow", gt],
    ["GrowTime", ns.tFormat(ns.getGrowTime(name))],
    ["GrowRatio", ns.formulas.hacking.growPercent(srv, gt, p)],
  ]
  ns.tprint(table(ns, [name, "Details"], out))
}

export function autocomplete(data, args) {
  return [...data.servers];
}

/**
 * @param {NS} ns
 * @param {name} string
 */
function countWT(ns, name) {
  let delta = ns.getServerSecurityLevel(name) - ns.getServerMinSecurityLevel(name)
  var w = 0
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
  start = ns.getServerMoneyAvailable(target)
  var ratio = Math.max(1, ns.getServerMaxMoney(target) / (1 + start))
  return Math.ceil(ns.growthAnalyze(target, ratio))
}

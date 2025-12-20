/** @param {NS} ns */
export async function main(ns) {
  let up = ns.args[0]
  ns.corporation.levelUpgrade(up)
}

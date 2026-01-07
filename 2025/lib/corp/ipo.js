/** @param {NS} ns */
export async function main(ns) {
  let shares = Number(ns.args[0])
  await ns.prompt("Go public?", boolean)
  ns.corporation.goPublic(shares)
}

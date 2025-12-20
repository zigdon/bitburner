/** @param {NS} ns */
export async function main(ns) {
  let shares = Number(ns.args[0])
  ns.corporation.goPublic(shares)
}

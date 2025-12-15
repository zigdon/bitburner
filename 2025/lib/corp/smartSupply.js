/** @param {NS} ns */
export async function main(ns) {
  let name = ns.args[0]
  let city = ns.args[1]
  let mats = ns.args.slice(2)
  let c = ns.corporation
  c.setSmartSupply(name, city, true)
  for (let mat of mats) {
    c.setSmartSupplyOption(name, city, mat, "leftovers")
  }
}

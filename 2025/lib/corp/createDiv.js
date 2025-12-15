/** @param {NS} ns */
export async function main(ns) {
  let ind = ns.args[0]
  let name = ns.args[1]
  let c = ns.corporation
  if (ns.corporation.getCorporation().divisions.includes(name)) {
    ns.printf("Can't create %s division %s", ind, name)
    return
  }
  ns.printf("Creating a new %s division: %s", ind, name)
  ns.corporation.expandIndustry(ind, name)
}

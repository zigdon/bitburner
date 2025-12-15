/** @param {NS} ns */
export async function main(ns) {
  let name = ns.args[0]
  let c = ns.corporation
  if (c.hasCorporation()) { return }
  if (c.canCreateCorporation(true)) {
    ns.printf("Creating a self-funded corp: %s", name)
    c.createCorporation(name, true)
  } else if (c.canCreateCorporation(false)) {
    ns.printf("Creating a grant-funded corp: %s", name)
    c.createCorporation(name, false)
  }
  ns.printf("Can't create corp")
}

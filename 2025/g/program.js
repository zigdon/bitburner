/** @param {NS} ns */
export async function main(ns) {
  for (var p of ns.singularity.getDarkwebPrograms()) {
    if (ns.fileExists(p, "home")) {
      continue
    }
    var m = ns.getPlayer().money
    if (ns.singularity.getDarkwebProgramCost(p) <= m) {
      if (ns.singularity.purchaseProgram(p)) {
        ns.toast(ns.sprintf("Purchased %s", p))
      }
    }
  }
}

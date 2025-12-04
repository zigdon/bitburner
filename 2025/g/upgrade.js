/** @param {NS} ns */
export async function main(ns) {
  var s = ns.singularity
  var p = ns.getPlayer
  var up = {cores:0, ram:0}
  while (s.getUpgradeHomeCoresCost() < p().money) {
    if (s.upgradeHomeCores()) {
      up.cores++
    }
  }
  while (s.getUpgradeHomeRamCost() < p().money) {
    if (s.upgradeHomeRam()) {
      up.ram++
    }
  }

  if (up.cores == 0 && up.ram == 0) {
    return
  }
  ns.toast(ns.sprintf("Upgrade home computer: %d cores, %d RAM", up.cores, up.ram))
  if (up.ram > 0) {
    ns.toast(ns.sprintf("Home RAM: %s", ns.formatRam(ns.getServerMaxRam("home"))))
  }
}

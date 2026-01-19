import { toast } from "@/log.js"
import { nsRPC } from "@/lib/nsRPC.js"

/** @param {NS} ons */
export async function main(ons) {
  ons.ramOverride(2.6)
  /** @type {NS} */
  let ns = new nsRPC(ons)
  let s = ns.singularity
  let p = ns.getPlayer
  let up = {cores:0, ram:0}
  while (await s.getUpgradeHomeCoresCost() < p().money) {
    if (await s.upgradeHomeCores()) {
      up.cores++
    }
  }
  while (await s.getUpgradeHomeRamCost() < p().money) {
    if (await s.upgradeHomeRam()) {
      up.ram++
    }
  }

  if (up.cores == 0 && up.ram == 0) {
    return
  }
  toast(ns, ns.sprintf("Upgrade home computer: %d cores, %d RAM", up.cores, up.ram))
  if (up.ram > 0) {
    toast(ns, ns.sprintf("Home RAM: %s", ns.formatRam(ns.getServerMaxRam("home"))))
  }
}

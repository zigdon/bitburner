import {toast} from "@/log.js"

/** @param {NS} ns */
export async function main(ns) {
  if (ns.singularity.exportGameBonus()) {
    await toast(ns, "Save game bonus available")
    ns.singularity.exportGame()
  }
}

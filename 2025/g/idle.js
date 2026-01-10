import {warning} from "@/log.js"

/** @param {NS} ns */
export async function main(ns) {
  let s = ns.singularity
  let b = ns.bladeburner
  if (s.isBusy() || b?.getCurrentAction()) {
    return
  }
  await warning(ns, "Player is idle")
}

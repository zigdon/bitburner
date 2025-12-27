import {warning} from "@/log.js"

/** @param {NS} ns */
export async function main(ns) {
  let s = ns.singularity
  if (s.isBusy()) {
    return
  }
  await warning(ns, "Player is idle")
}

import {nsRPC} from "@/lib/nsRPC.js"

/** @param {NS} ons */
export async function main(ns) {
  ons.ramOverride(1.6)
  /** @type {NS} ns */
  let ns = new nsRPC(ons)
  await ns.singularity.purchaseTor()
}

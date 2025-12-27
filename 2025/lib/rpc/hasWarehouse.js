import { dn } from "@/lib/dn.js"

/** @param {NS} ons */
export async function main(ons) {
  /** @type {NS} ns */
  let ns = new dn(ons)

  await ns.listen("corporation_hasWarehouse", ons.corporation.hasWarehouse)
}

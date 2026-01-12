import {toast} from "@/log.js"
import {nsRPC} from "@/lib/nsRPC.js"
/** @param {NS} ons */
export async function main(ons) {
  let ns = new nsRPC(ons)
  ns.ramOverride(1.6)
  // Check and accept any faction invites.
  var joined = []
  var failed = []
  var owned = await ns.singularity.getOwnedAugmentations(true)
  for (var f of await ns.singularity.checkFactionInvitations()) {
    var offered = await ns.singularity.getAugmentationsFromFaction(f)
    offered = offered.filter(
      (f) => !owned.includes(f)
    )

    if (offered.length == 0) {
      ns.printf("Skipping faction invite: %s", f)
      continue
    }
    if (await ns.singularity.joinFaction(f)) {
      joined.push(f)
    } else {
      failed.push(f)
    }
  }
  if (joined.length > 0) {
    toast(ns, ns.sprintf("Joined factions: %s", joined.join(", ")), "success")
  }
  if (failed.length > 0) {
    toast(ns, ns.sprintf("Failed to join factions: %s", joined.join(", ")), "error")
  }
}

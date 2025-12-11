import {toast} from "@/log.js"
/** @param {NS} ns */
export async function main(ns) {
  // Check and accept any faction invites.
  var joined = []
  var failed = []
  var owned = ns.singularity.getOwnedAugmentations(true)
  for (var f of ns.singularity.checkFactionInvitations()) {
    var offered = ns.singularity.getAugmentationsFromFaction(f).filter(
      (f) => !owned.includes(f)
    )

    if (offered.length == 0) {
      ns.printf("Skipping faction invite: %s", f)
      continue
    }
    if (ns.singularity.joinFaction(f)) {
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

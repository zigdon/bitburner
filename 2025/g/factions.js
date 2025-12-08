/** @param {NS} ns */
export async function main(ns) {
  // Check and accept any faction invites.
  var skip = [
    "Aevum",
    "Sector-12",
  ]
  var joined = []
  var failed = []
  for (var f of ns.singularity.checkFactionInvitations()) {
    if (skip.includes(f)) {
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
    ns.toast(ns.sprintf("Joined factions: %s", joined.join(", ")), "success")
  }
  if (failed.length > 0) {
    ns.toast(ns.sprintf("Failed to join factions: %s", joined.join(", ")), "error")
  }
}

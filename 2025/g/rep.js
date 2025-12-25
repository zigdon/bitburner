// Select a faction to gain rep for. Options:
// - Select work type, otherwise pick best rep/sec
// - Select limit, otherwise stop enough rep was gained for all augs
// - Select favor limit
// - Select what to do once reached, otherwise, raise a notification

import {info, warning} from "@/log.js"
import {factions} from "@/factions.js"
import {singleInstance} from "@/lib/util.js"

/** @param {NS} ns */
export async function main(ns) {
  if (!singleInstance(ns)) { return }

  ns.disableLog("asleep")
  let flags = ns.flags([
    ["work", "hacking"],
    ["limit", 0],
    ["favor", false],
    ["then", ""],
    ["interrupt", false],
    ["focus", false],
  ])

  let s = ns.singularity
  let fac = flags._[0]
  if (!factions.includes(fac)) {
    let opts = factions.map(
      (f) => [f, f.toLowerCase()]
    ).filter(
      (f) => f[1].includes(fac.toLowerCase())
    ).map(
      (f) => f[0]
    )
    if (opts.length != 1) {
      ns.tprintf("Unknown faction '%s'. Options:", fac)
      opts.forEach((o) => ns.tprintf("  %s", o))
      return
    }
    fac = opts[0]
    ns.tprintf("Selected faction: %s", fac)
  }

  let then = ""
  if (flags["then"] != "") {
    then = flags["then"]
    if (!factions.includes(then)) {
      let opts = factions.map(
        (f) => [f, f.toLowerCase()]
      ).filter(
        (f) => f[1].includes(then.toLowerCase())
      ).map(
        (f) => f[0]
      )
      if (opts.length != 1) {
        ns.tprintf("Unknown faction '%s'. Options:", then)
        opts.forEach((o) => ns.tprintf("  %s", o))
        return
      }
      then = opts[0]
      ns.tprintf("Selected faction once complete: %s", then)
    }
  }

  if (s.getCurrentWork() != null && !flags["interrupt"]) {
    await warning(ns, "Can grind rep, not idle")
    return
  }
  s.stopAction()

  let owned = s.getOwnedAugmentations(true)
  let target = Math.max(
    ...s.getAugmentationsFromFaction(fac).filter(
      (a) => !owned.includes(a)
    ).map(
      (a) => s.getAugmentationRepReq(a)
    )
  )
  if (flags["favor"] == 0) {
    await info(ns, "Grinding rep with %s up to %s",
      fac, ns.formatNumber(flags["limit"] == 0 ? target : flag["limit"]))
  } else {
    await info(ns, "Grinding rep with %s", fac)
  }

  while (true) {
    await ns.asleep(1000)

    if (s.getCurrentWork() == null) {
      ns.printf("Grinding rep with %s", fac)
      s.workForFaction(fac, flags["work"], flags["focus"])
    }

    let rep = s.getFactionRep(fac)
    ns.printf("rep = %s", ns.formatNumber(rep))
    if (flags["limit"] > 0 && rep >= flags["limit"]) {
      await info(ns, "Reached %s rep with %s", ns.formatNumber(rep), fac)
      break
    }
    if (flags["favor"] && s.getFactionFavorGain(faq) > flags["limit"]) {
      await info(ns, "Will gain %s favor with %s",
        ns.formatNumber(s.getFactionFavorGain(faq)), fac)
      break
    }
    if (flags["limit"] > 0 || flags["favor"] > 0) {
      continue
    }
    ns.printf("Grinding for rep with %s: %s", fac,  ns.formatNumber(target))
    if (rep >= target) {
      await info(ns, "Reached %s rep for all augs with %s", ns.formatNumber(rep), fac)
      break
    }
  }

  s.stopAction()

  if (then != "") {
    s.workForFaction(then, flags["work"], flags["focus"])
  } else {
    ns.toast(ns.sprintf("Done grinding rep with %s", fac), "success", null)
  }
}


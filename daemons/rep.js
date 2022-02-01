import { getFactions } from "/lib/constants.js";
import * as fmt from "/lib/fmt.js";
import { netLog } from "/lib/log.js";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep")
  var facts = getFactions();
  var reps = new Map();
  var canGet = new Map();
  var donation = ns.getFavorToDonate();
  while (true) {

    for (var f of facts) {
      var need = 0;
      for (var a of ns.getAugmentationsFromFaction(f)) {
        var n = ns.getAugmentationRepReq(a);
        if (n > need && canGet.has(a)) {
          need = n;
        } else {
          canGet.set(a, true);
        }
      }
      if (reps.has(f)) {
        reps.get(f).rep = ns.getFactionRep(f)
        reps.get(f).need = need;
      } else {
        var st = ns.getFactionRep(f)
        var fav = ns.getFactionFavor(f);
        reps.set(f, { rep: st, start: st, need: need, hasFavor: fav >= donation });
      }
    }

    var delta = 0;
    var sel;
    var favDelta = 0;
    var favSel;
    var sel;
    for (f of reps) {
      if (f[1].rep == 0) { continue }
      var rec = f[1];
      await netLog(ns, "%s: %s/%s (gained: %s)",
        f[0], fmt.int(rec.rep), fmt.int(rec.need), fmt.int(rec.rep - rec.start));
      var missing = rec.need - rec.rep
      if (f[1].hasFavor) {
        if ((missing < favDelta && missing > 0) || favDelta <= 0) {
          favDelta = missing;
          favSel = f[0]
        }
      } else {
        if ((missing < delta && missing > 0) || delta <= 0) {
          delta = missing;
          sel = f[0]
        }
      }
    }

    if (delta > 0) {
      await netLog(ns, "selected %s, need: %s", sel, fmt.int(delta));
      ns.workForFaction(sel, "hacking", ns.isFocused())
    } else if (favDelta > 0) {
      await netLog(ns, "selected %s, need: %s", favSel, fmt.int(favDelta));
      ns.workForFaction(favSel, "hacking", ns.isFocused())
    } else {
      await netLog(ns, "done: %d", delta)
      return
    }

    await ns.sleep(60000)
  }

}
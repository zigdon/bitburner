import { getFactions } from "/lib/constants.js";
import * as fmt from "/lib/fmt.js";
import * as zui from "/lib/ui.js";
import { console, netLog } from "/lib/log.js";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep")
  var facts = getFactions();
  var reps = new Map();
  var canGet = new Map();
  var donation = ns.getFavorToDonate();
  var owned = ns.getOwnedAugmentations(true);
  var rate = 0;
  zui.customOverview("rep", "Rep");
  ns.atExit(() => zui.rmCustomOverview("rep"));
  while (true) {
    for (var f of facts) {
      var need = 0;
      for (var a of ns.getAugmentationsFromFaction(f)) {
        if (owned.indexOf(a) >= 0) {
          continue
        }
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

    if (delta <= 0 && favDelta <= 0) {
      await console(ns, "No augs require rep, done.");
      return;
    }
    var target = delta > 0 ? sel : favSel;
    delta = delta > 0 ? delta : favDelta;
    zui.setCustomOverview("rep", sprintf("%s\n%s", fmt.int(delta), fmt.time(delta/rate)));
    await netLog(ns, "selected %s, need: %s (%s estimated)", target, fmt.int(delta), fmt.time(delta / rate));
    ns.workForFaction(target, "hacking", ns.isFocused())

    await ns.sleep(300000)
    delta = ns.getFactionRep(target) - reps.get(target).rep;
    rate = delta / 300000;
  }

}
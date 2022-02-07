import * as fmt from "/lib/fmt.js";
import * as zui from "/lib/ui.js";

/** @param {NS} ns **/
export async function main(ns) {
    var skill = ns.args[0].toLowerCase();
    var target = ns.args[1];

    var p = ns.getPlayer();
    var getCur;
    var mult;
    switch (skill) {
        case "hack":
            getCur = () => p.hacking_exp;
            mult = p.hacking_mult;
            break;
        default:
            ns.tprintf("Dunno how to look up %s", skill);
    }
    var id = "est-" + skill;
    zui.customOverview(id, "Hack " + target);
    ns.atExit(() => zui.rmCustomOverview(id));

    var xpNeeded = ns.formulas.skills.calculateExp(target, mult);
    var cur = getCur();
    var last = [cur];
    while (cur < xpNeeded) {
        /*
        ns.tprintf("%s/%s (%.2f%%), +%s (%d), ETA: %s",
          fmt.large(cur), 
          fmt.large(xpNeeded), 
          cur/xpNeeded*100, 
          fmt.large(rate(cur,last)), 
          last.length,
          fmt.time((xpNeeded-cur)/rate(cur,last)*1000));
          */
        zui.setCustomOverview(
            id,
            sprintf("+%s\n%s",
            fmt.large(rate(cur, last)),
            fmt.time((xpNeeded - cur) / rate(cur, last) * 1000)));
        await ns.sleep(1000);
        p = ns.getPlayer();
        last.unshift(cur);
        while (last.length > 300) {
            last.pop();
        }
        cur = getCur();
    }
}

/**
 * @param {number} cur
 * @param {number[]} hist
 */
function rate(cur, hist) {
    return (cur - hist[hist.length - 1]) / hist.length;
}
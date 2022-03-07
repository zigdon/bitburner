import * as fmt from "/lib/fmt.js";
import {newUI} from "/lib/ui.js";
import {toast} from "/lib/log.js";

/** @param {NS} ns **/
export async function main(ns) {
    let skill = ns.args[0].toLowerCase();
    let target = fmt.parseNum(ns.args[1]);

    let p = ns.getPlayer();
    let getCur;
    let mult;
    let needed;
    let ffmt = n => fmt.large(n, {digits:0});
    switch (skill) {
        case "hack":
            getCur = () => p.hacking_exp;
            mult = p.hacking_mult;
            needed = ns.formulas.skills.calculateExp(target, mult)*mult;
            break;
        case "money":
            getCur = () => p.money;
            needed = target;
            ffmt = fmt.money;
            break;
        default:
            ns.tprintf("Dunno how to look up %s", skill);
            return;
    }
    let id = "est-" + skill;
    let ui = await newUI(ns, id, `${skill[0].toUpperCase()+skill.substr(1)} ${ffmt(target)}`);

    if (skill != "money") {
        ns.tprintf("XP for %s@%s: %s/%s with %s multiplier.", skill, fmt.int(target), fmt.large(getCur()), fmt.large(needed), fmt.int(mult));
    }
    let cur = getCur();
    let last = [cur];
    while (cur < needed) {
        await ui.update(`${ffmt(rate(cur, last))}/${fmt.time((needed - cur) / rate(cur, last) * 1000)}`);
        await ns.sleep(1000);
        p = ns.getPlayer();
        last.unshift(cur);
        while (last.length > 300) {
            last.pop();
        }
        cur = getCur();
    }
    await ui.remove();
    await toast(ns, "%s got to %s", skill, ffmt(target), {level: "success", timeout: 30000});
}

/**
 * @param {number} cur
 * @param {number[]} hist
 */
function rate(cur, hist) {
    return (cur - hist[hist.length - 1]) / hist.length;
}
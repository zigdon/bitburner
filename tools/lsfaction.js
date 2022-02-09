import { getFactions, longFact, shortFact } from "/lib/constants.js";
import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    var fact = ns.args[0];
    if (!fact) {
        lsFacts(ns);
        return;
    }
    fact = longFact(fact);
    if (!fact) {
        ns.tprintf("Unknown faction.");
        return;
    }

    ns.tprintf("%s (%s)", fact, shortFact(fact));
    ns.tprintf("Rep: %s,  Favor: %s,  Gain: %s", fmt.large(ns.getFactionRep(fact)), ns.getFactionFavor(fact), ns.getFactionFavorGain(fact));
    var owned = ns.getOwnedAugmentations(true);
    var data = [];
    var augs = ns.getAugmentationsFromFaction(fact).sort();
    var n = 1;
    var percent = (n) => n ? sprintf("%d", (n-1)*100) : "-";
    for (var name of augs) {
        var a = ns.getAugmentationStats(name);
        data.push([
            n++,
            name,
            owned.indexOf(name) == -1 ? "x" : "✓",
            ns.getAugmentationPrice(name),
            ns.getAugmentationRepReq(name),
            ns.getAugmentationPrereq(name).
                map(aug => owned.indexOf(aug) > -1 ?
                    "✓" : augs.indexOf(aug) > -1 ?
                        augs.indexOf(aug) + 1 : aug).join(", "),
            a.hacking_mult,
            a.hacking_chance_mult,
            a.hacking_exp_mult,
            a.hacking_grow_mult,
            a.hacking_money_mult,
            a.hacking_speed_mult,
        ])
    }
    ns.tprintf(fmt.table(
        data,
        ["#", "NAME", "OWNED", "PRICE", "REP", "PREREQ", "H Mult", "H Chance", "H Exp", "H Grow", "H Money", "H Speed"],
        [null, null, null, fmt.money, fmt.large, null, percent, percent, percent, percent, percent, percent],
    ))
}

/**
 * @param {NS} ns
 */
function lsFacts(ns) {
    var data = [];
    var owned = ns.getOwnedAugmentations(true);
    for (var f of getFactions().sort()) {
        data.push([
            f,
            shortFact(f),
            ns.getFactionRep(f),
            ns.getFactionFavor(f),
            ns.getFactionFavorGain(f),
            sprintf("%d/%d",
                ns.getAugmentationsFromFaction(f).filter(a => owned.indexOf(a) >= 0).length,
                ns.getAugmentationsFromFaction(f).length),
        ])
    }
    ns.tprintf(fmt.table(
        data,
        ["NAME", "INIT", "REP", "FAVOR", "GAIN", "AUGS"],
        [null, null, fmt.large, fmt.large, fmt.large]));
}
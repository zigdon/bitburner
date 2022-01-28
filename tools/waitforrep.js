import {longFact} from "/lib/constants.js";
import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    var fact = longFact(ns.args[0]);
    var target = fmt.parseNum(ns.args[1]);
    ns.print(ns.sprintf("waiting for %s rep with %s", target, fact));
    ns.tail();

    while (true) {
        ns.print(ns.stopAction());
        var cur = ns.getFactionRep(fact);
        ns.print("Current rep: ", cur);
        if (cur >= target) {
            ns.stopAction();
            return;
        }
        ns.workForFaction(fact, "hacking", true);
        await ns.sleep(5000);

    }

}
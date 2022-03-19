import * as fmt from "/lib/fmt.js";
import {console} from "/lib/log.js";

/** @param {NS} ns **/
export async function main(ns) {
    await console(ns, "\n%s", fmt.table([
        ...Object.entries(ns.getBitNodeMultipliers())
        .map(m => [m[0], fmt.pct(m[1])])
    ]));
}
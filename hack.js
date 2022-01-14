import * as fmt from "/lib/fmt.js";
import {netLog} from "/lib/log.js";

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var loot = await ns.hack(target);
    await netLog(ns, "hack %s finished, got $%s", target, fmt.int(loot));
}
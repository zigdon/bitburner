import {netLog} from "/lib/log.js";

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var growth = await ns.grow(target);
    await netLog(ns, "grow %s finished, grew by %.2f%%", target, (growth-1)*100);
}
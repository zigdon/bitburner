import * as fmt from "lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var baseSec = ns.getServerMinSecurityLevel(target);
    var curSec = ns.getServerSecurityLevel(target);
    var maxVal = ns.getServerMaxMoney(target);
    var curVal = ns.getServerMoneyAvailable(target);
    while(true) {
        await ns.sleep(1000);
        ns.tprintf("%s: %s/%s, %s/%s", target, fmt.int(curSec), fmt.int(baseSec), fmt.int(curVal), fmt.int(maxVal));
    }
    

}
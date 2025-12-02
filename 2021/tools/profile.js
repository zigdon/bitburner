/*
Server base security level: 45
Server current security level: 45
Server growth rate: 51
Netscript hack() execution time: 3 minutes 36.934 seconds
Netscript grow() execution time: 11 minutes 34.191 seconds
Netscript weaken() execution time: 14 minutes 27.739 seconds
*/

import * as fmt from "lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var baseSec = ns.getServerMinSecurityLevel(target);
    var curSec = ns.getServerSecurityLevel(target);
    var maxVal = ns.getServerMaxMoney(target);
    var curVal = ns.getServerMoneyAvailable(target);
    var growthRate = ns.getServerGrowth(target);
    var hackTime = ns.getHackTime(target);
    var growTime = ns.getGrowTime(target);
    var weakenTime = ns.getWeakenTime(target);

    ns.tprintf("Security: %.2f/%.2f", curSec, baseSec);
    ns.tprintf("Value: $%s/$%s", fmt.int(curVal), fmt.int(maxVal));
    ns.tprintf("Growth rate: %d", growthRate);
    ns.tprintf("Times: hack: %s; grow: %s; weaken: %s", fmt.time(hackTime, {digits:2}), fmt.time(growTime,{digits:2}), fmt.time(weakenTime, {digits:2}));
}
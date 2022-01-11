/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    await ns.grow(target);
    ns.tprintf("%s grow %s finished", new Date().toLocaleTimeString("en-US", { timeZone: "PST" }), target);
}
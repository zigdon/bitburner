/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    await ns.weaken(target);
    ns.tprintf("%s weaken %s finished", new Date().toLocaleTimeString("en-US", { timeZone: "PST" }), target);
}
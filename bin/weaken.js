import {delay, execCmd} from "/lib/hack.js";

/** @param {NS} ns **/
export async function main(ns) {
    let flags = ns.flags([
        ["eta", 0],
        ["delta", 0],
        ["start", 0],
    ]);
    let target = ns.args[0];
    if (Date.now() < flags.start) {
        await delay(ns, flags.start);
    }
    await execCmd(ns, ns.weaken, target, "weaken", flags.eta, flags.delta);
}
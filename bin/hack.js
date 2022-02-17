import {execCmd} from "/lib/hack.js";

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var eta = ns.args[1];
    var delta = ns.args[2];
    await execCmd(ns, ns.hack, target, "hack", eta, delta);
}
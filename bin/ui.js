import * as zui from "/lib/ui.js"

/** @param {NS} ns **/
export async function main(ns) {
    var cmd = ns.args.shift();
    var id = ns.args.shift();
    switch (cmd) {
        case "create":
            zui.customOverview(id, ns.args.join(" "));
            break;
        case "update":
            zui.setCustomOverview(id, ns.args.join(" "));
            break;
        case "delete":
            zui.rmCustomOverview(id);
            break;
        default:
            ns.tprint(`Unknown command ${cmd}`);
    }
}
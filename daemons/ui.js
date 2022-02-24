import * as zui from "/lib/ui.js";
import {netLog} from "/lib/log.js";
import {getPorts} from "/lib/ports.js";

/** @param {NS} ns **/
export async function main(ns) {
    var ports = getPorts();
    while (true) {
        var data = ns.readPort(ports.UI);
        if (data.startsWith("NULL")) {
            await ns.sleep(1000);
            continue;
        }
        var words = data.split(" ");
        var cmd = words.shift();
        var id = words.shift();
        switch (cmd) {
            case "create":
                zui.rmCustomOverview(id);
                zui.customOverview(id, words.join(" "));
                break;
            case "update":
                zui.setCustomOverview(id, words.join(" ").replaceAll(/\\n/g, "<br/>"));
                break;
            case "delete":
            case "remove":
                zui.rmCustomOverview(id);
                break;
            case "restart":
                ns.spawn(ns.getScriptName());
            default:
                ns.tprint(`Unknown command ${cmd}`);
        }
    }
}
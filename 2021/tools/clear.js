import {portAlias, portName} from "/lib/ports.js";

/** @param {NS} ns **/
export async function main(ns) {
    var portNum = portAlias(ns.args[0]);
    ns.tprintf("Clearing port %d (%s)", portNum, portName(portNum));
    while (true) {
        var msg = ns.readPort(portNum);
        ns.tprint(msg);
        if (msg == "NULL PORT DATA") {
            ns.exit();
        }
    }
}
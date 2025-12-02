import {portAlias, portName} from "/lib/ports.js";

/** @param {NS} ns **/
export async function main(ns) {
    var port = portAlias(ns.args[0]);
    var ph = ns.getPortHandle(port);
    var msg = ns.args.slice(1).join(" ");
    ph.write(msg);
    ns.tprintf("sent: '%s' to %d (%s)", msg, port, portName(port));
}
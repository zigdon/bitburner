import {portAlias, portName} from "/lib/ports.js";

/** @param {NS} ns **/
export async function main(ns) {
    var port = portAlias(ns.args[0]);
    var ph = ns.getPortHandle(port);
    var msg = ph.read();
    ns.tprintf("read (%s): '%s'", portName(port), msg);
}
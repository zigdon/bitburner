import {portAlias, portName} from "/lib/ports.js";

/** @param {NS} ns **/
export async function main(ns) {
    var portNum = portAlias(ns.args[0]);
    var port = ns.getPortHandle(portNum);
    ns.tprintf("%s: '%s'", portName(portNum), port.peek());
}
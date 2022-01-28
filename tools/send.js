import {getPorts} from "/lib/ports.js";

var ports = getPorts();
/** @param {NS} ns **/
export async function main(ns) {
    var port = ns.args[0];
    switch (port) {
        case "worker":
            port = ports.CONTROLLER;
            break;
        case "controller":
            port = ports.CONTROLLER_CTL;
            break;
        case "buyer":
            port = ports.BUYER_CTL;
            break;
        case "logger":
            port = ports.LOGGER_CTL;
            break;
        case "cron":
            port = ports.CRON_CTL;
            break;
    }
    var ph = ns.getPortHandle(port);
    var msg = ns.args.slice(1).join(" ");
    await ph.write(msg);
    ns.tprintf("sent: '%s'", msg);
}
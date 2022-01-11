/** @param {NS} ns **/
export async function main(ns) {
    var port = ns.args[0];
    switch (port) {
        case "worker":
            port = 2;
            break;
        case "controller":
            port = 3;
            break;
        case "buyer":
            port = 4;
            break;
    }
    var ph = ns.getPortHandle(port);
    var msg = ns.args.slice(1).join(" ");
    await ph.write(msg);
    ns.tprintf("sent: '%s'", msg);
}
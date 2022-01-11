/** @param {NS} ns **/
export async function main(ns) {
    var port = ns.args[0];
    ns.tprintf("Clearing port %d", port);
    while (true) {
        var msg = ns.readPort(port);
        ns.tprint(msg);
        if (msg == "NULL PORT DATA") {
            ns.exit();
        }
    }
}
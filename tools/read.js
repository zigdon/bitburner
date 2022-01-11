/** @param {NS} ns **/
export async function main(ns) {
    var port = ns.getPortHandle(ns.args[0]);
    var msg = await port.read();
    ns.tprintf("read: '%s'", msg);
}
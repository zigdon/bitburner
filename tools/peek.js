/** @param {NS} ns **/
export async function main(ns) {
    var port = ns.getPortHandle(ns.args[0]);
    ns.tprintf("'%s'", port.peek());
}
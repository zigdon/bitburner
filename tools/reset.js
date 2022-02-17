/** @param {NS} ns **/
export async function main(ns) {
    if (ns.args[0] == "ALL") {
        ns.args = ns.getPurchasedServers();
    }
    while (ns.args.length > 0) {
        var target = ns.args.shift();
        ns.tprintf("Killing all on %s", target);
        var totals = {};
        for (var p of ns.ps(target)) {
            totals[p.filename] = (totals[p.filename] || 0) + 1;
            ns.kill(p.pid);
        }
        ns.tprint(totals);
    }
}
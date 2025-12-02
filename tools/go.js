import * as hosts from "/lib/hosts.js";

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0].toLowerCase();
    var hs = hosts.hosts(ns).map((h) => { return [h.host, h.host.toLowerCase()] });
    var eq = hs.filter((h) => { return h[1] == target });
    if (eq.length == 1) {
        hosts.go(ns, eq[0][0]);
        return;
    }

    var prefix = hs.filter((h) => { return h[1].startsWith(target) });
    if (prefix.length == 1) {
        hosts.go(ns, prefix[0][0]);
        return;
    } else {
        ns.tprintf("prefix: %s", prefix);
    }

    var subs = hs.filter((h) => { return h[1].indexOf(target) >= 0 })
    if (subs.length == 1) {
        hosts.go(ns, subs[0][0]);
        return;
    } else {
        ns.tprintf("substr: %s", prefix);
    }
}
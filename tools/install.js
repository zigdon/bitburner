/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var tool = ns.args[1];
    var args = ns.args.splice(2);

    switch (tool) {
        case "batch":
            await installBatch(ns, target, args[0]);
            break;
        case "weaken":
            await installWeaken(ns, target);
            break;
        default:
            ns.tprintf("Looking up what should be installed on %s", target);
            var a = readAssignments(ns);
            var h = a.find((h) => {return h.worker == target});
            if (h) {
                ns.tprintf("Installing batch on %s to hack %s", h.worker, h.target);
                await installBatch(ns, h.worker, h.target);
            } else {
                ns.tprintf("No entry found for %s", target);
            }
    }

}

export async function installBatch(ns, worker, target) {
    if (target != "home") {
        await ns.scp(
            ["weaken.js", "hack.js", "grow.js", "/daemons/batch.js", 
                "/lib/fmt.js", "/lib/log.js"], "home", worker);
        ns.killall(worker);
    }
    if (!ns.exec("daemons/batch.js", worker, 1, target)) {
        ns.tprintf("Failed to launch batch on %s", worker);
    }
}

export async function installWeaken(ns, worker) {
    if (worker != "home") {
        await ns.scp(
            ["weaken.js", "/daemons/weakener.js",
            "/lib/fmt.js", "/lib/log.js", "/lib/assignments.txt"], "home", worker);
        ns.killall(worker);
    }
    if (ns.getServerMaxRam(worker) > ns.getScriptRam("/daemons/weakener.js")) {
        if (!ns.exec("/daemons/weakener.js", worker)) {
            ns.tprintf("Failed to launch weakener on %s", worker);
        }
    }
}

/**
 * @param {NS} ns
 * @returns {Object[]}
 */
export function readAssignments(ns) {
    var data = ns.read("/lib/assignments.txt")
    if (!data) {
        return [];
    }
    var res = [];
    data.split("\n").forEach((l) => {
        var bits = l.trim().split("\t");
        res.push({worker: bits[0], target: bits[1]});
    })

    return res;
}
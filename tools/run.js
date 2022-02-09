/** @param {NS} ns **/
export async function main(ns) {
    var path = ["", "/tools", "/daemons"];
    var file = ns.args[0];
    var all = ns.ls("home", file).filter(f => f.endsWith(".js"));
    var opts = [];
    var full = "";
    while (path.length > 0) {
        if (path[0] == "") {
            opts.push(...all.filter((f) => { return !f.includes("/") }))
        } else {
            opts.push(...all.filter((f) => { return f.startsWith(path[0]) }))
        }
        ns.print([path[0], file].join("/")+".js");
        if (ns.fileExists([path[0], file].join("/")+".js")) {
            full = [path[0], file].join("/")+".js";
            await run(ns, full);
        }
        path.shift();
    }
    if (opts.length == 1) {
        ns.tprintf("Single match: %s", opts[0]);
        await run(ns, opts[0]);
    } else if (opts.length > 1) {
        ns.tprintf("Matches: %s", opts);
        return;
    }
    ns.tprint("File not found.");
}

/**
 * @param {NS} ns
 * @param {String} path
 */
async function run(ns, path) {
    var pid;
    if (ns.args.length > 1) {
        pid = ns.run(path, 1, ...ns.args.splice(1));
    } else {
        pid = ns.run(path, 1);
    }
    if (pid) {
        ns.tprintf("Launched %s with PID %d", path, pid);
    } else {
        ns.tprintf("*** Failed to launch %s!", path);
    }
    ns.exit();
}
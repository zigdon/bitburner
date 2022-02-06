/** @param {NS} ns **/
export async function main(ns) {
    var res = await ns.prompt("Reset server state?");
    if (!res) {
        ns.tprint("Aborting!");
        return;
    }
    ns.rm("/conf/assignments.txt");
    ns.exec("/tools/rmlogs.js", "home");
    var pid = ns.exec("/daemons/logger.js", "home");
    ns.tail(pid, "home");
    ns.exec("/daemons/buyer.js", "home");
    ns.exec("/daemons/cron.js", "home");
    ns.exec("/daemons/joiner.js", "home");
    ns.exec("/daemons/monitor.js", "home");
    ns.exec("/daemons/gangmgr.js", "home");
    ns.exec("/daemons/controller.js", "home");
    ns.exec("/tools/scan.js", "home");
    ns.exec("/tools/buyprogs.js", "home");
    pid = ns.exec("/tools/search-and-hack.js", "home");
    while (ns.isRunning(pid, "home")) {
        await ns.sleep(500);
    }
    ns.exec("/tools/install.js", "home");
    // ns.exec("/tools/home-batch.js", "home")
}
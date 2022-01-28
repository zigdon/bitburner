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
    ns.exec("/daemons/monitor.js", "home");
    ns.exec("/tools/scan.js", "home");
    ns.exec("/tools/search-and-hack.js", "home");
    ns.exec("/tools/buyprogs.js", "home");
    var reserve = Math.ceil(ns.getServerUsedRam("home")/10)*10;
    ns.exec("/daemons/batch.js", "home", 1, "foodnstuff");
}
import * as zui from "/lib/ui.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    var reserve = parseMemory(ns.args[0]);
    ns.print("Reserving ", reserve, " GB");
    var hostname = ns.getHostname();
    var thread = ns.getScriptRam("/bin/share.js");
    if (hostname == "home") {
        zui.customOverview("sharePower", "Sharing");
    }
    ns.print("Each thread needs ", thread, " GB");
    ns.atExit(function() {zui.rmCustomOverview("sharePower")});
    while(true) {
        await ns.sleep(Math.random()*10000+1000);
        var avail = ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname);
        avail -= reserve;
        var n = avail/thread;
        if (n < 1) {
            continue;
        }
        var pid = ns.run("/bin/share.js", n);
        var sp = 1;
        while (ns.isRunning(pid, hostname)) {
            var newSP = ns.getSharePower();
            if (sp != newSP && hostname == "home") {
                zui.setCustomOverview("sharePower", ns.sprintf("+%.2f%%", (ns.getSharePower()-1)*100));
                sp = newSP;
            }
            await ns.sleep(500);
        }
    }
}

function parseMemory(n) {
    if (typeof(n) == "number") {
        return n;
    }
    if (!n) {
        return 0;
    }
    var unit = n.substring(n.length-2);
    n = n.substring(0, n.length-2);
    switch (unit) {
        case "pb":
            n*=1000;
        case "tb":
            n*=1000;
        default:
            n*=1;
    }

    return n;
}
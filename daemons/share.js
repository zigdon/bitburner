import {newUI} from "/lib/ui.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    let reserve = parseMemory(ns.args[0]);
    ns.print("Reserving ", reserve, " GB");
    let hostname = ns.getHostname();
    let thread = ns.getScriptRam("/bin/share.js");
    let ui = await newUI(ns, "share", "Sharing");
    ns.print("Each thread needs ", thread, " GB");
    while(true) {
        await ns.sleep(1);
        let avail = ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname);
        avail -= reserve;
        let n = avail/thread;
        if (n < 1) {
            continue;
        }
        let pid = ns.run("/bin/share.js", n);
        let sp = 1;
        while (ns.isRunning(pid, hostname)) {
            let newSP = ns.getSharePower();
            if (sp != newSP && hostname == "home") {
                await ui.update(`+${((ns.getSharePower()-1)*100).toFixed(2)}`);
                sp = newSP;
            }
            await ns.sleep(100);
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
    let unit = n.substring(n.length-2);
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
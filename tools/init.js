import {keep} from "/lib/log.js";
import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    let flags = ns.flags([
        ["batch", false],
        ["money", 0],
    ]);
    if (flags.batch) {
        ns.exec("/tools/reboot.js", "home", 1, "--money", flags.money || 1e11, "--batch");
    } else {
        let res = await ns.prompt("Reset server state?");
        if (!res) {
            ns.tprint("Aborting!");
            return;
        }
    }
    let player = ns.getPlayer();
    await keep(ns, "Init at BN%d, %s in this node.", player.bitNodeN, fmt.time(player.playtimeSinceLastBitnode));
    ns.rm("/conf/assignments.txt");
    ns.rm("/conf/hosts.txt");
    ns.exec("/tools/rmlogs.js", "home");
    let pid = ns.exec("/daemons/logger.js", "home");
    ns.tail(pid, "home");
    // ns.exec("/daemons/controller.js", "home");

    let mem = ns.getServerMaxRam("home");
    if (mem >= 64) {
        ns.tprint("Launching small daemons");
        ns.exec("/daemons/cron.js", "home");
    }
    if (mem >= 128) {
        ns.tprint("Launching medium daemons");
        ns.exec("/daemons/buyer.js", "home");
        ns.exec("/daemons/ui.js", "home");
        ns.exec("/daemons/monitor.js", "home");
        ns.exec("/daemons/buyprogs.js", "home");
        ns.exec("/daemons/logsweeper.js", "home");
        ns.exec("/daemons/hackmgr.js", "home");
        ns.exec("/daemons/homeUpgrader.js", "home");
        ns.exec("/daemons/sleevemgr.js", "home");
        ns.exec("/daemons/gangmgr.js", "home");
        ns.exec("/daemons/helper.js", "home");
        ns.exec("/daemons/queen.js", "home");
        ns.exec("/daemons/batch-director.js", "home");
    }
    if (mem >= 512) {
        ns.tprint("Launching large daemons");
        ns.exec("/daemons/joiner.js", "home");
        ns.exec("/daemons/corpmon.js", "home");
        ns.exec("/daemons/bladeburner.js", "home");
    }
    pid = ns.exec("/tools/search-and-hack.js", "home");
    while (ns.isRunning(pid, "home")) {
        await ns.sleep(500);
    }
    pid = ns.exec("/tools/scan.js", "home");
    while (ns.isRunning(pid, "home")) {
        await ns.sleep(500);
    }
    ns.exec("/tools/install.js", "home");
}
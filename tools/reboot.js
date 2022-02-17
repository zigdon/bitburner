import {getFactions, longFact} from "/lib/constants.js";
import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    var logFile = "/log/keep/reboot.txt";
    async function log(t, ...args) {
        var ts = new Date().toLocaleString();
        t = "\n" + ts + " - " + t;
        await ns.write(logFile, ns.sprintf(t, ...args), "a");
    }
    var flags = ns.flags([
        ["time", null],
        ["money", null],
        ["hack", null],
        ["rep", null],
        ["donate", null],
        ["now", false],
        ["batch", false],
        ["any", false],
    ])

    var [waitDesc, waitFuncs] = parseFlags(ns, flags);

    var msg = "";
    if (waitDesc.length > 0) {
        var any = waitDesc.length == 1 ? "" : flags.any ? "(any) " : "(all) "
        msg = "Waiting for " + any + waitDesc.join(", ") + " then install augs and reboot?";
    } else {
        msg = "Install augs and reboot?";
    }
    if (!flags.batch && !await ns.prompt(msg)) {
        return;
    }

    if (waitFuncs.length > 0) {
        var startWait = Date.now();
        ns.toast(`Waiting for ${flags.any ? "(any) " : ""}${waitDesc.join(", ")}...`, "warning", null);
        var check = flags.any ? (t, f) => t || f() : (t, f) => t && f();
        while (!waitFuncs.reduce(check, !flags.any)) {
            ns.print(`Still waiting for ${(flags.any ? "any of: " : "all of: ")}${waitDesc.join(", ")}`);
            await ns.sleep(5000);
        }
        ns.toast(`Wait complete, after ${fmt.time(Date.now()-startWait)}`, "success", 30000);
        await log("Wait complete after %s", fmt.time(Date.now()-startWait));
    }

    if (ns.isRunning("/daemons/buyer.js", "home")) {
        ns.kill("/daemons/buyer.js", "home");
    }

    var pid = ns.run("/tools/lsaugs.js", 1, "buy", "hack", "--quiet");
    while (ns.isRunning(pid, "home")) {
        await ns.sleep(100);
    }
    var installedAugs = ns.getOwnedAugmentations(false);
    var allAugs = ns.getOwnedAugmentations(true);
    var newAugs = [];
    for (var a of allAugs) {
        if (installedAugs.indexOf(a) == -1) {
            newAugs.push(a);
        }
    }
    await log("New augs:\n%s", newAugs.join("\n"));

    // Buy any server upgrades
    var c = 0;
    while (ns.getServerMoneyAvailable("home") > ns.getUpgradeHomeCoresCost()) {
        if (!ns.upgradeHomeCores()) {
            break;
        }
        c++;
    }
    ns.toast(`Upgraded home cores ${c} times`, "success", null);
    await log(`Upgraded home cores ${c} times`);

    c = 0;
    while (ns.getServerMoneyAvailable("home") > ns.getUpgradeHomeRamCost()) {
        if (!ns.upgradeHomeRam()) {
            break;
        }
        c++;
    }
    ns.toast(`Upgraded RAM ${c} times`, "success", null);
    await log(`Upgraded RAM ${c} times to ${fmt.memory(ns.getServerMaxRam("home"))}`);

    if (!flags.now) {
        ns.toast("Reboot in 1 minute!", "warning", 30000);
        await ns.sleep(30000);
        ns.toast("Reboot in 30 seconds!", "warning", 20000);
        await ns.sleep(20000);
        for (var i=10; i>0; i--) {
            ns.toast(`Reboot in ${i} seconds!`, "warning", 1000);
            await ns.sleep(1000);
        }
    }

    // Buy any possible NeuroFlux Governor
    // Find the faction with the most rep
    c = 0;
    for(var fact of getFactions().map(f => [f, ns.getFactionRep(f)]).sort((a,b) => b[1]-a[1])) {
        while (ns.purchaseAugmentation(fact[0], "NeuroFlux Governor")) {
            c++;
        }
        if (c > 0) {
            ns.toast(`Bought NeuroFlux Governors from ${fact[0]} ${c} times`, "success", null);
            await log(`Bought NeuroFlux Governors from ${fact[0]} ${c} times`);
            break;
        }
    }

    // Install any augs
    ns.installAugmentations("/bin/reboot-init.js");
}

/**
 * @param {NS} ns
 * @param {Object} flags
 */
function parseFlags(ns, flags) {
    var waitDesc = [];
    var waitFuncs = [];
    if (flags.time) {
        var waitTime = fmt.parseTime(flags.time);
        waitDesc.push(fmt.time(waitTime));
        var start = Date.now();
        waitFuncs.push(function() {
            return Date.now() - start > waitTime;
        });
    }
    if (flags.money) {
        var waitMoney = fmt.parseNum(flags.money);
        waitDesc.push(fmt.money(waitMoney));
        waitFuncs.push(function() {
            return ns.getServerMoneyAvailable("home") > waitMoney;
        });
    }
    if (flags.hack) {
        var waitHack = fmt.parseNum(flags.hack);
        waitDesc.push("hack @" + fmt.int(waitHack));
        waitFuncs.push(function() {
            return ns.getPlayer().hacking > waitHack;
        })
    }
    if (flags.rep) {
        var [factName, rep] = flags.rep.split("=");
        var fact = longFact(factName);
        if (!fact) {
            ns.tprintf("Unknown faction %s!", factName);
            return;
        }
        waitDesc.push(`${fact}@${rep}`);
        waitFuncs.push(function() {
            return ns.getFactionRep(fact) > rep;
        })
    }
    if (flags.donate) {
        var fact = longFact(flags.donate);
        if (!fact) {
            ns.tprintf("Unknown faction %s!", flags.donate);
            return;
        }
        waitDesc.push(`can donate to ${fact}`);
        waitFuncs.push(function() {
            var pending = ns.getPlayer().currentWorkFactionName == fact ? ns.getPlayer().workRepGained : 0;
            var extra = Math.log(pending / 25000 + 1) / Math.log(1.02)
            return ns.getFactionFavorGain(fact) + ns.getFactionFavor(fact) + extra > ns.getFavorToDonate();
        })
    }

    return [waitDesc, waitFuncs];
}
import {getFactions, longFact} from "/lib/constants.js";
import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    var flags = ns.flags([
        ["time", null],
        ["money", null],
        ["hack", null],
        ["rep", null],
        ["now", null],
    ])
    var waitDesc = [];
    var waitFuncs = [];
    if (flags.time) {
        waitTime = fmt.parseTime(flags.time);
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
            return ns.getFactionFavorGain(fact) + ns.getFactionFavor(fact) > ns.getFavorToDonate();
        })
    }

    var msg = "";
    if (waitDesc.length > 0) {
        msg = "Waiting for " + waitDesc.join(", ") + " then install augs and reboot?";
    } else {
        msg = "Install augs and reboot?";
    }
    if (!await ns.prompt(msg)) {
        return;
    }

    if (waitFuncs.length > 0) {
        var startWait = Date.now();
        ns.toast(`Waiting for ${waitDesc.join(", ")}...`, "warning", null);
        while (!waitFuncs.reduce((t, f) => t && f(), true)) {
            ns.print(`Still waiting for ${waitDesc.join(", ")}`);
            await ns.sleep(5000);
        }
        ns.toast(`Wait complete, after ${fmt.time(Date.now()-startWait)}`, "success", 30000);
    }

    var pid = ns.run("/tools/lsaugs.js", 1, "buy", "hack", "--quiet");
    while (ns.isRunning(pid, "home")) {
        await ns.sleep(100);
    }

    // Buy any server upgrades
    var c = 0;
    while (ns.getServerMoneyAvailable("home") > ns.getUpgradeHomeCoresCost()) {
        if (!ns.upgradeHomeCores()) {
            break;
        }
        c++;
    }
    ns.toast(`Upgraded home cores ${c} times`, "success", null);

    c = 0;
    while (ns.getServerMoneyAvailable("home") > ns.getUpgradeHomeRamCost()) {
        if (!ns.upgradeHomeRam()) {
            break;
        }
        c++;
    }
    ns.toast(`Upgraded RAM ${c} times`, "success", null);

    // Buy any possible NeuroFlux Governor
    // Find the faction with the most rep
    c = 0;
    for(var fact of getFactions().map(f => [f, ns.getFactionRep(f)]).sort((a,b) => b[1]-a[1])) {
        ns.toast(`Trying to buy extra augs from ${fact[0]}`);
        while (ns.purchaseAugmentation(fact[0], "NeuroFlux Governor")) {
            c++;
        }
        if (c > 0) {
            ns.toast(`Bought NeuroFlux Governors from ${fact[0]} ${c} times`, "success", null);
            break;
        }
    }

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

    // Install any augs
    ns.installAugmentations("/bin/reboot-init.js");
}
import {getFactions, longFact} from "/lib/constants.js";
import * as fmt from "/lib/fmt.js";
import {keep, toast} from "/lib/log.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    let flags = ns.flags([
        ["time", null],
        ["money", null],
        ["hack", null],
        ["rep", null],
        ["donate", null],
        ["now", false],
        ["batch", false],
        ["any", false],
        ["noaugs", false],
    ])

    let [waitDesc, waitFuncs] = parseFlags(ns, flags);

    let msg = "";
    if (waitDesc.length > 0) {
        let any = waitDesc.length == 1 ? "" : flags.any ? "(any) " : "(all) "
        msg = "Waiting for " + any + waitDesc.join(", ") + " then install augs and reboot?";
    } else {
        msg = "Install augs and reboot?";
    }
    if (!flags.batch && !await ns.prompt(msg)) {
        return;
    }

    if (waitFuncs.length > 0) {
        let startWait = Date.now();
        ns.toast(`Waiting for ${flags.any ? "(any) " : ""}${waitDesc.join(", ")}...`, "warning", null);
        let check = flags.any ? (t, f) => t || f() : (t, f) => t && f();
        while (!waitFuncs.reduce(check, !flags.any)) {
            ns.print(`Still waiting for ${(flags.any ? "any of: " : "all of: ")}${waitDesc.join(", ")}`);
            await ns.sleep(5000);
        }
        ns.toast(`Wait complete, after ${fmt.time(Date.now()-startWait)}`, "success", 30000);
        await keep(ns, "Wait complete after %s", fmt.time(Date.now()-startWait));
    }

    if (ns.isRunning("/daemons/buyer.js", "home")) {
        ns.kill("/daemons/buyer.js", "home");
    }

    let pid = ns.run("/tools/lsaugs.js", 1, "buy", "hack", "--quiet");
    while (ns.isRunning(pid, "home")) {
        await ns.sleep(100);
    }
    let installedAugs = ns.getOwnedAugmentations(false);
    let allAugs = ns.getOwnedAugmentations(true);
    let newAugs = [];
    for (let a of allAugs) {
        if (installedAugs.indexOf(a) == -1) {
            newAugs.push(a);
        }
    }
    if (newAugs.length == 0 && !flags.noaugs) {
        await toast(ns, "Couldn't buy any augs, and --noaugs wasn't passed!", {level: "error", timeout: 0});
        return;
    }
    if (newAugs.length > 0) {
        await keep(ns, "New augs:\n%s", newAugs.join("\n"));
    }

    // Buy any server upgrades
    let c = 0;
    while (ns.getServerMoneyAvailable("home") > ns.getUpgradeHomeCoresCost()) {
        if (!ns.upgradeHomeCores()) {
            break;
        }
        c++;
    }
    if (c) {
        ns.toast(`Upgraded home cores ${c} times`, "success", null);
        await keep(ns, `Upgraded home cores ${c} times`);
    }

    c = 0;
    while (ns.getServerMoneyAvailable("home") > ns.getUpgradeHomeRamCost()) {
        if (!ns.upgradeHomeRam()) {
            break;
        }
        c++;
    }
    if (c) {
        ns.toast(`Upgraded RAM ${c} times`, "success", null);
        await keep(ns, `Upgraded RAM ${c} times to ${fmt.memory(ns.getServerMaxRam("home"))}`);
    }

    if (!flags.now) {
        ns.toast("Reboot in 1 minute!", "warning", 30000);
        await ns.sleep(30000);
        ns.toast("Reboot in 30 seconds!", "warning", 20000);
        await ns.sleep(20000);
        for (let i=10; i>0; i--) {
            ns.toast(`Reboot in ${i} seconds!`, "warning", 1000);
            await ns.sleep(1000);
        }
    }
    
    ns.stopAction();

    // Buy any possible NeuroFlux Governor
    // Find the faction with the most rep
    c = 0;
    for(let fact of getFactions().map(f => [f, ns.getFactionRep(f)]).sort((a,b) => b[1]-a[1])) {
        while (ns.purchaseAugmentation(fact[0], "NeuroFlux Governor")) {
            c++;
        }
        if (c > 0) {
            ns.toast(`Bought NeuroFlux Governors from ${fact[0]} ${c} times`, "success", null);
            await keep(ns, `Bought NeuroFlux Governors from ${fact[0]} ${c} times`);
            break;
        }
    }

    // Save progress
    let player = ns.getPlayer();
    await keep(ns, "Rebooting BN%d, %s since last reboot", player.bitNodeN, fmt.time(player.playtimeSinceLastAug));
    if (player.numPeopleKilled) {
        await keep(ns, "Current player kills: %s", player.numPeopleKilled);
    }
    if (flags.money) {
        await ns.write("/conf/rebootState.txt", Math.floor(1.5 * Number(fmt.parseNum(flags.money))), "w");
    } else {
        ns.rm("/conf/rebootState.txt");
    }

    // Install any augs
    ns.installAugmentations("/bin/reboot-init.js");
}

/**
 * @param {NS} ns
 * @param {Object} flags
 */
function parseFlags(ns, flags) {
    let waitDesc = [];
    let waitFuncs = [];
    if (flags.time) {
        let waitTime = fmt.parseTime(flags.time);
        waitDesc.push(fmt.time(waitTime));
        let start = Date.now();
        waitFuncs.push(function() {
            return Date.now() - start > waitTime;
        });
    }
    if (flags.money) {
        let waitMoney = fmt.parseNum(flags.money);
        waitDesc.push(fmt.money(waitMoney));
        waitFuncs.push(function() {
            return ns.getServerMoneyAvailable("home") > waitMoney;
        });
    }
    if (flags.hack) {
        let waitHack = fmt.parseNum(flags.hack);
        waitDesc.push("hack @" + fmt.int(waitHack));
        waitFuncs.push(function() {
            return ns.getPlayer().hacking > waitHack;
        })
    }
    if (flags.rep) {
        let [factName, rep] = flags.rep.split("=");
        let fact = longFact(factName);
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
        let fact = longFact(flags.donate);
        if (!fact) {
            ns.tprintf("Unknown faction %s!", flags.donate);
            return;
        }
        waitDesc.push(`can donate to ${fact}`);
        waitFuncs.push(function() {
            let pending = ns.getPlayer().currentWorkFactionName == fact ? ns.getPlayer().workRepGained : 0;
            let extra = Math.log(pending / (25000 + 1)) / Math.log(1.02)
            return ns.getFactionFavorGain(fact) + ns.getFactionFavor(fact) + extra > ns.getFavorToDonate();
        })
    }

    return [waitDesc, waitFuncs];
}
import * as fmt from "/lib/fmt.js";
import {netLog, toast} from "/lib/log.js";
import {printInfo, getRate, spend} from "/lib/hacknet.js";
import {newUI} from "/lib/ui.js";
import {ports} from "/lib/ports.js";

const saveFile = "/conf/hackmgr.txt";
let reserveCash = 0;
let safety = fmt.parseTime("60s");
let mode = "idle";
let capacity = 1000;
let nextUpgrades = {};

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tail();
    loadSettings(ns);
    let ui = await newUI(ns, "hacknet", "HackNet");
    while (true) {
        const rate = getRate(ns);
        let update = fmt.large(ns.hacknet.numHashes()) + "/" +
            fmt.large(ns.hacknet.hashCapacity()) + "\n" +
            fmt.large(rate, {digits:3}) + "/s (" +
            fmt.money(rate * 250000, 0) + "/s)";
        await ui.update(update);
        await checkCtl(ns);
        await checkSpend(ns);
        await checkOverflow(ns);
        await upgradeServers(ns);
        ns.clearLog();
        ns.print(`Cash reserve: ${fmt.money(reserveCash)};   Hash overflow buffer: ${fmt.time(safety)};  Capacity goal: ${fmt.large(capacity, {digits:0})}`);
        ns.print(`Next upgrades:  ${Object.entries(nextUpgrades).map(u => `${u[0]}: ${fmt.money(u[1])}`).join(";  ")}`);
        ns.print(printInfo(ns));
        await ns.sleep(200);
    }
}

/** @param {NS} ns */
function loadSettings(ns) {
    if (ns.fileExists(saveFile, "home")) {
        [reserveCash, safety, mode, capacity] = JSON.parse(ns.read(saveFile));
        reserveCash ||= 0;
        reserveCash ||= fmt.parseTime("60s");
        mode ||= "idle";
        capacity ||= 1000;
    }
}

/** @param {NS} ns */
async function saveSettings(ns) {
    await ns.write(saveFile, JSON.stringify([reserveCash, safety, mode, capacity]), "w");
}

/** @param {NS} ns */
async function checkSpend(ns) {
    switch(mode[0]) {
        case "spend":
            while (ns.hacknet.spendHashes(spend.MONEY)) {
                await ns.sleep(1);
            }
            break;
    }

}

/** @param {NS} ns */
async function upgradeServers(ns) {
    let upgrades = [
        {name: "RAM", cost: n => ns.hacknet.getRamUpgradeCost(n, 1), f: n => ns.hacknet.upgradeRam(n, 1)},
        {name: "Cores", cost: n => ns.hacknet.getCoreUpgradeCost(n, 1), f: n => ns.hacknet.upgradeCore(n, 1)},
        {name: "Level", cost: n => ns.hacknet.getLevelUpgradeCost(n, 1), f: n => ns.hacknet.upgradeLevel(n, 1)},
    ]
    if (ns.hacknet.hashCapacity() < capacity) {
        upgrades.push(
            {name: "Cache", cost: n => ns.hacknet.getCacheUpgradeCost(n, 1), f: n => ns.hacknet.upgradeCache(n, 1)},
        );
    }
    let best;
    nextUpgrades = {};
    for (let n=0; n < ns.hacknet.numNodes(); n++) {
        for (let t of upgrades) {
            if (!best || t.cost(n) < best.cost) {
                best = {cost: t.cost(n), type: t.name, f: t.f, id: n};
            }
            if (!nextUpgrades[t.name] || nextUpgrades[t.name] > t.cost(n)) {
                nextUpgrades[t.name] = t.cost(n);
            }
        }
    }
    if (!best || best.cost > ns.hacknet.getPurchaseNodeCost()) {
        best = {cost: ns.hacknet.getPurchaseNodeCost(), type: "New", f: ns.hacknet.purchaseNode, n: 0};
    }
    if (!nextUpgrades["New"] || nextUpgrades["New"] > ns.hacknet.getPurchaseNodeCost()) {
        nextUpgrades["New"] = ns.hacknet.getPurchaseNodeCost();
    }
    
    if (best && best.cost < ns.getServerMoneyAvailable("home") - reserveCash) {
        if (best.type == "New") {
            await toast(ns, "Upgrading server farm: Buying new server");
            best.f();
        } else {
            await toast(ns, "Upgrading server farm: %s for #%d", best.type, best.id);
            best.f(best.id);
        }
    }
}

/** @param {NS} ns */
async function checkOverflow(ns) {
    if ((ns.hacknet.hashCapacity() - ns.hacknet.numHashes()) / getRate(ns) <= safety/1000) {
        let c = 0;
        while ((ns.hacknet.hashCapacity() - ns.hacknet.numHashes()) / getRate(ns) <= safety/1000) {
            if (ns.hacknet.spendHashes(spend.MONEY)) {
                c++;
            } else {
                break;
            }
            await ns.sleep(1);
        }
        if (c > 0) {
            await toast(ns, `Spent ${c*4} hashes for ${fmt.money(c*1e6)} to avoid overflow`, {level: "warning"});
        }
    }
}

/** @param {NS} ns */
async function checkCtl(ns) {
    let data = ns.readPort(ports.HACKMGR);
    if (data.startsWith("NULL")) { return }

    let words = data.split(" ");
    switch (words[0]) {
        case "quit":
            await toast(ns, "hackmgr quitting...", {level: "warning"});
            ns.exit();
            break;
        case "restart":
            await toast(ns, "hackmgr restart...", {level: "warning"});
            ns.spawn(ns.getScriptName());
            break;
        case "capacity":
            capacity = fmt.parseNum(words[1])
            await saveSettings(ns);
            await toast(ns, "hackmgr setting capacity to %s", fmt.large(capacity, { digits: 0 }));
            break;
        case "reserve":
            reserveCash = fmt.parseNum(words[1])
            await saveSettings(ns);
            await toast(ns, "hackmgr setting reserve to %s", fmt.money(reserveCash));
            break;
        case "safety":
            safety = fmt.parseTime(words[1])
            await saveSettings(ns);
            await toast(ns, "hackmgr setting safety margin to %s", fmt.time(safety));
            break;
        case "mode":
            mode = words.slice(1);
            await saveSettings(ns);
            await toast(ns, "hackmgr setting mode to %s", mode);
            break;
        default:
            await toast(ns, "hackmgr: unknown command %s", words[0], {level: "warning"});
    }
}
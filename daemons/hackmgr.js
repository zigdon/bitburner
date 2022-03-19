import * as fmt from "/lib/fmt.js";
import { toast, netLog } from "/lib/log.js";
import { printInfo, getRate, spend } from "/lib/hacknet.js";
import { newUI } from "/lib/ui.js";
import { ports } from "/lib/ports.js";
import { settings } from "/lib/state.js";

const saveFile = "/conf/hackmgr.txt";
let st;
let safety = fmt.parseTime("60s");
let mode = ["idle"];
let capacity = 0;
let nextUpgrades = {};
let overflow = 0;
let lastToast = 0;
let toBuy = [];
let uiElements = {
    hash: {enabled: false, f: (ns) => fmt.large(ns.hacknet.numHashes()) + "/" + fmt.large(ns.hacknet.hashCapacity())},
    rate: {enabled: false, f: (ns) => fmt.large(getRate(ns), { digits: 3 })+"/s"},
    income: {enabled: false, f: (ns) => fmt.money(getRate(ns) * 250000, { digits: 2 }) + "/s"},
    count: {enabled: false, f: (ns) => `nodes: ${ns.hacknet.numNodes()}/${ns.hacknet.maxNumNodes()}`},
    next: {enabled: false, f: () => Object.entries(nextUpgrades)
        .filter(u => u[0].includes("*"))
        .map(u => `${u[0].replaceAll("*", "")}: ${fmt.money(u[1])}`)[0]
    },
    stats: {enabled: false, f: (ns) => Array(ns.hacknet.numNodes())
        .fill(0)
        .map((_, i) => ns.hacknet.getNodeStats(i))
        .map(s => [s.ram, s.cores, s.level])
        .reduce((t, c) => {c.forEach((v, i) => t[i] = Math.max(t[i], v)); return t}, [0, 0, 0])
        .join("/")
    },
    util: {enabled: false, f: (ns) => "Util: " + (Array(ns.hacknet.numNodes())
        .fill(0)
        .map((_, i) => ns.hacknet.getNodeStats(i))
        .map(s => s.ramUsed/s.ram)
        .reduce((t, c) => t+c, 0)*100/ns.hacknet.numNodes()).toFixed(2) + "%"
    },
    spend: {enabled: false, f: (ns) => `${mode[0]}: ${fmt.large(ns.hacknet.hashCost(modeToSpend(mode[0])), {digits:2})}`},
};

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tail();
    st = settings(ns, "hackmgr");
    loadSettings(ns);
    let ui = await newUI(ns, "hacknet", "HackNet");
    while (true) {
        await updateUI(ns, ui);
        await checkCtl(ns, ui);
        await checkSpend(ns);
        await checkOverflow(ns);
        let now = Date.now();
        if (overflow > 0 && now - lastToast > 30000) {
            await toast(ns, `Spent ${overflow * 4} hashes for ${fmt.money(overflow * 1e6)} to avoid overflow`, { level: "warning" });
            overflow = 0;
            lastToast = now;
        }
        await upgradeServers(ns);
        ns.clearLog();
        let cap = capacity ? fmt.large(capacity, { digits: 0 }) : "(" + fmt.large(getRate(ns) * safety / 500, { digits: 0}) + ")";
        ns.print([
            `Cash reserve: ${fmt.money(st.get("reserve"))}`,
            `Hash overflow buffer: ${fmt.time(safety)}`,
            `Mode: ${toBuy.length > 0 ? toBuy[0] : mode[0]}`,
            `Capacity goal: ${cap}`,
        ].join(";  "));
        ns.print(`Next upgrades:  ${Object.entries(nextUpgrades).filter(u => u[1] < Infinity).map(u => `${u[0]}: ${fmt.money(u[1])}`).join(";  ") || "None"}`);
        ns.print(printInfo(ns));
        await ns.sleep(200);
    }
}

/**
 * @param {NS} ns
 * @param {object} ui
 */
async function updateUI(ns, ui) {
    let updates = [];
    for (let [k, v] of Object.entries(uiElements)) {
        if (!v.enabled) { continue; }
        updates.push(v.f(ns));
    }
    await ui.update(updates.join("\n"));
}

/** @param {NS} ns */
function loadSettings(ns) {
    if (ns.fileExists(saveFile, "home")) {
        let uie;
        [safety, mode, capacity, toBuy, uie] = JSON.parse(ns.read(saveFile));
        safety ||= fmt.parseTime("60s");
        toBuy ||= [];
        mode ||= ["idle"];
        capacity ||= 0;
        if (uie === undefined) { uie = [] }
        for (let e of uie) {
            uiElements[e].enabled = true;
        }
        if (Object.values(uiElements).every(e => !e.enabled)) {
            uiElements["rate"].enabled = true;
        }
    }
}

/** @param {NS} ns */
async function saveSettings(ns) {
    let uie = [];
    for (let [k, v] of Object.entries(uiElements)) {
        if (v.enabled) { uie.push(k)}
    }
    await ns.write(saveFile, JSON.stringify([safety, mode, Math.floor(capacity), toBuy, uie]), "w");
}

/**
 * @param {string} spend
 */
function modeToSpend(target) {
    switch (target) {
        case "spend":
            return spend.MONEY;
        case "corp":
            return spend.CORPMONEY;
        case "research":
            return spend.CORPRES;
        case "contract":
        case "contracts":
            return spend.CONTRACT;
        case "study":
            return spend.STUDY;
        case "gym":
            return spend.GYM;
        case "idle":
            return null;
        default:
            return null;
    }
}

/** @param {NS} ns */
async function checkSpend(ns) {
    let target = toBuy.length > 0 ? toBuy[0] : mode[0];
    let spendOn = modeToSpend(target);
    if (!spendOn && target != "idle") {
        await toast(ns, "Unknown spending target: %s", target, {level: "warning"});
        toBuy = [];
        mode = ["idle"];
    }
    if (!spendOn) { return }
    let c = 0;
    while (ns.hacknet.spendHashes(spendOn) && c++ < 100) {
        if (toBuy.length > 0) {
            toBuy.shift();
            break;
        }
        await ns.sleep(1);
    }
    if (c == 100) {
        await toast(ns, "Can't spend fast enough on %s, bursting contracts for 5s", target, {level: "warning"});
        let start = Date.now();
        while (Date.now() - start < 5000) {
            if (!ns.hacknet.spendHashes(spend.CONTRACT)) {
                break;
            }
        }
    }
}

/** @param {NS} ns */
async function upgradeServers(ns) {
    let upgrades = [
        { name: "RAM", cost: n => ns.hacknet.getRamUpgradeCost(n, 1), f: n => ns.hacknet.upgradeRam(n, 1) },
        { name: "Cores", cost: n => ns.hacknet.getCoreUpgradeCost(n, 1), f: n => ns.hacknet.upgradeCore(n, 1) },
    ]
    if (!st.read("useHacknetBees")) {
        upgrades.push(
            { name: "Level", cost: n => ns.hacknet.getLevelUpgradeCost(n, 1), f: n => ns.hacknet.upgradeLevel(n, 1) },
        );
    }
    let target = capacity;
    if (!target) {
        target = getRate(ns) * safety/1000*2;
    }
    if (ns.hacknet.hashCapacity() < target) {
        upgrades.push(
            { name: "Cache", cost: n => ns.hacknet.getCacheUpgradeCost(n, 1), f: n => ns.hacknet.upgradeCache(n, 1) },
        );
    }
    let done = {};
    while (true) {
        await ns.sleep(1);
        let best;
        nextUpgrades = {};
        for (let n = 0; n < ns.hacknet.numNodes(); n++) {
            for (let t of upgrades) {
                if (!best || t.cost(n) < best.cost) {
                    best = { cost: t.cost(n), type: t.name, f: t.f, id: n };
                }
                if (!nextUpgrades[t.name] || nextUpgrades[t.name] > t.cost(n)) {
                    nextUpgrades[t.name] = t.cost(n);
                }
            }
        }
        if (!best || best.cost > ns.hacknet.getPurchaseNodeCost()) {
            best = { cost: ns.hacknet.getPurchaseNodeCost(), type: "New", f: ns.hacknet.purchaseNode, n: 0 };
        }
        if (!nextUpgrades["New"] || nextUpgrades["New"] > ns.hacknet.getPurchaseNodeCost()) {
            nextUpgrades["New"] = ns.hacknet.getPurchaseNodeCost();
        }
        nextUpgrades[`*${best.type}*`] = nextUpgrades[best.type];
        delete nextUpgrades[best.type];

        if (best && best.cost < ns.getServerMoneyAvailable("home") - st.get("reserve")) {
            if (best.type == "New") {
                done["new"] ||= 0;
                done["new"]++;
                best.f();
            } else {
                done[best.type] ||= [];
                done[best.type][best.id] ||= 0;
                done[best.type][best.id]++;
                best.f(best.id);
            }
        } else {
            break;
        }
    }
    for (let [k,v] of Object.entries(done)) {
        if (k == "new" && v > 0) {
            await toast(ns, "Upgrading server farm: Buying %d new server%s", done["new"], done["new"] != 1 ? "s" : "");
            continue;
        }
        await netLog(ns, "Upgrading server farm: %s %s times", k, v.reduce((t, c) => t+c));
    }
}

/** @param {NS} ns */
async function checkOverflow(ns) {
    if ((ns.hacknet.hashCapacity() - ns.hacknet.numHashes()) / getRate(ns) <= safety / 1000) {
        if (mode[0] != "spend") {
            if (capacity) {
                capacity *= 1.1;
                await toast(ns, "Increasing capacity to %s", fmt.large(capacity));
            } else {
                safety *= 1.1;
                await toast(ns, "Increasing safety buffer to %s", fmt.time(safety));
            }
        }
        let c = 0;
        while ((ns.hacknet.hashCapacity() - ns.hacknet.numHashes()) / getRate(ns) <= safety / 1000) {
            if (ns.hacknet.spendHashes(spend.MONEY)) {
                overflow++;
                c++;
            } else {
                break;
            }
            await ns.sleep(1);
            if (c > 100) {
                await toast(ns, "Can't spend overflow hashes fast enough!", {level: "warning"});
                break;
            }
        }
    }
}

/**
 * @param {NS} ns
 * @param {object} ui
 **/
async function checkCtl(ns, ui) {
    let data = ns.readPort(ports.HACKMGR);
    if (data.startsWith("NULL")) { return }

    let words = data.split(" ");
    switch (words[0]) {
        case "quit":
            await toast(ns, "hackmgr quitting...", { level: "warning" });
            ns.exit();
            break;
        case "restart":
            await toast(ns, "hackmgr restart...", { level: "warning" });
            await ui.remove();
            ns.spawn(ns.getScriptName());
            break;
        case "capacity":
            capacity = fmt.parseNum(words[1])
            await saveSettings(ns);
            await toast(ns, "hackmgr setting capacity to %s", capacity ? fmt.large(capacity, { digits: 0 }) : "auto");
            break;
        case "safety":
            safety = fmt.parseTime(words[1])
            await saveSettings(ns);
            await toast(ns, "hackmgr setting safety margin to %s", fmt.time(safety));
            break;
        case "mode":
            mode = words.slice(1)
            await saveSettings(ns);
            await toast(ns, "hackmgr setting mode to %s", mode[0]);
            break;
        case "ui":
            words.shift();
            while (words.length > 0) {
                let element = words.shift();
                if (Object.keys(uiElements).includes(element)) {
                    uiElements[element].enabled = !uiElements[element].enabled;
                } else {
                    ns.tprintf("Valid UI elements: %s", Object.keys(uiElements).join(", "));
                    break;
                }
            }
            await saveSettings(ns);
            break;
        case "buy":
            toBuy.push(words[1])
            await saveSettings(ns);
            await toast(ns, "adding %s to the shopping list: %s",
                words[1], toBuy.join(", "));
            break;
        case "reset":
            toBuy = [];
            await saveSettings(ns);
            await toast(ns, "reset shopping list.");
            break;
        default:
            await toast(ns, "hackmgr: unknown command %s", words[0], { level: "warning" });
    }
}
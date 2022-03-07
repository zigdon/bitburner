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
let capacity = 1000;
let nextUpgrades = {};
let overflow = 0;
let lastToast = 0;

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tail();
    st = settings(ns, "hackmgr");
    loadSettings(ns);
    let ui = await newUI(ns, "hacknet", "HackNet");
    while (true) {
        const rate = getRate(ns);
        let update = fmt.large(ns.hacknet.numHashes()) + "/" +
            fmt.large(ns.hacknet.hashCapacity()) + "\n" +
            fmt.large(rate, { digits: 3 }) + "/s (" +
            fmt.money(rate * 250000, 0) + "/s)";
        await ui.update(update);
        await checkCtl(ns);
        await checkSpend(ns);
        await checkOverflow(ns);
        let now = Date.now();
        if (overflow > 0 && now - lastToast > 30000) {
            await toast(ns, `Spent ${overflow * 4} hashes for ${fmt.money(c * 1e6)} to avoid overflow`, { level: "warning" });
            overflow = 0;
            lastToast = now;
        }
        await upgradeServers(ns);
        ns.clearLog();
        ns.print([
            `Cash reserve: ${fmt.money(st.get("reserve"))}`,
            `Hash overflow buffer: ${fmt.time(safety)}`,
            `Mode: ${mode[0]}`,
            `Capacity goal: ${fmt.large(capacity, { digits: 0 })}`,
        ].join(";  "));
        ns.print(`Next upgrades:  ${Object.entries(nextUpgrades).filter(u => u[1] < Infinity).map(u => `${u[0]}: ${fmt.money(u[1])}`).join(";  ") || "None"}`);
        ns.print(printInfo(ns));
        await ns.sleep(200);
    }
}

/** @param {NS} ns */
function loadSettings(ns) {
    if (ns.fileExists(saveFile, "home")) {
        [safety, mode, capacity] = JSON.parse(ns.read(saveFile));
        safety ||= fmt.parseTime("60s");
        mode ||= ["idle"];
        capacity ||= 1000;
    }
}

/** @param {NS} ns */
async function saveSettings(ns) {
    await ns.write(saveFile, JSON.stringify([safety, mode, capacity]), "w");
}

/** @param {NS} ns */
async function checkSpend(ns) {
    let spendOn;
    switch (mode[0]) {
        case "spend":
            spendOn = spend.MONEY;
            break;
        case "corp":
            spendOn = spend.CORPMONEY;
            break;
        case "research":
            spendOn = spend.CORPRES;
            break;
    }
    if (spendOn) {
        let c = 0;
        while (ns.hacknet.spendHashes(spendOn) && c++ < 100) {
            await ns.sleep(1);
        }
        if (c == 100) {
            await toast(ns, "Can't spend fast enough on %s, 5s burst...", mode[0], {level: "warning"});
            let start = Date.now();
            while (Date.now() - start < 5000) {
                if (!ns.hacknet.spendHashes(spendOn)) {
                    break;
                }
            }
        }
    }
}

/** @param {NS} ns */
async function upgradeServers(ns) {
    let upgrades = [
        { name: "RAM", cost: n => ns.hacknet.getRamUpgradeCost(n, 1), f: n => ns.hacknet.upgradeRam(n, 1) },
        { name: "Cores", cost: n => ns.hacknet.getCoreUpgradeCost(n, 1), f: n => ns.hacknet.upgradeCore(n, 1) },
        { name: "Level", cost: n => ns.hacknet.getLevelUpgradeCost(n, 1), f: n => ns.hacknet.upgradeLevel(n, 1) },
    ]
    let done = {};
    while (true) {
        await ns.sleep(1);
        if (ns.hacknet.hashCapacity() < capacity) {
            upgrades.push(
                { name: "Cache", cost: n => ns.hacknet.getCacheUpgradeCost(n, 1), f: n => ns.hacknet.upgradeCache(n, 1) },
            );
        }
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
        await netLog(ns, "Upgrading server farm: %s for %s", k, v.filter(i => i > 0).map((v, i) => `#${i}: ${v}`).join(", "));
    }
}

/** @param {NS} ns */
async function checkOverflow(ns) {
    if ((ns.hacknet.hashCapacity() - ns.hacknet.numHashes()) / getRate(ns) <= safety / 1000) {
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

/** @param {NS} ns */
async function checkCtl(ns) {
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
            ns.spawn(ns.getScriptName());
            break;
        case "capacity":
            capacity = fmt.parseNum(words[1])
            await saveSettings(ns);
            await toast(ns, "hackmgr setting capacity to %s", fmt.large(capacity, { digits: 0 }));
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
        default:
            await toast(ns, "hackmgr: unknown command %s", words[0], { level: "warning" });
    }
}

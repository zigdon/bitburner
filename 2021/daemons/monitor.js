import {plot} from "/lib/asciichart.js";
import * as fmt from "/lib/fmt.js";
import {getPorts} from "/lib/ports.js";

let state = {};
const ports = getPorts();
let avg = [];
let hist = [];
let format = function(n) {
    let f = fmt.money(n);
    return " ".repeat(8-f.length) + f;
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    ns.disableLog("getServerMoneyAvailable");
    ns.disableLog("getServerMaxMoney");
    ns.disableLog("getServerSecurityLevel");
    ns.disableLog("getServerMinSecurityLevel");
    ns.disableLog("getServerMaxRam");
    ns.disableLog("getServerUsedRam");

    ns.tail();
    let lastUpdate = 0;
    await ns.writePort(ports.UI, "create batch Batching");
    while(true) {
        if (Date.now() - lastUpdate > 1000) {
            await postUpdate(ns);
            lastUpdate = Date.now();
        }
        let data = ns.readPort(ports.BATCHMON);
        if (data.startsWith("NULL")) {
            await ns.sleep(500);
            continue
        }
        await ns.sleep(50);
        handleUpdate(ns, data);
    }
}

/**
 * @param {NS} ns
 */
async function postUpdate(ns) {
    let sum = 0;
    let now = Date.now();
    avg.forEach((a) => {
        if (now - a[0] < 10000) {
            sum += Number(a[1]);
        }
    })
    avg = avg.filter((a) => { return now - a[0] < 10000 })
    hist.push(sum / 10);

    let hosts = Object.keys(state).sort();
    ns.clearLog();
    
    let data = [];
    for (let h of hosts) {
        let ent = state[h];
        while (ent.recent.length > 10) {
            ent.recent.pop();
        }
        let delta = now-ent.lastSeen;
        delta -= delta % 1000;
        if (delta > 1200000) {
            continue;
        } else if (delta > 600000) {
            if (ent.host == "home") {
                continue;
            }
            delta = "MIA";
        }
        let age = now-ent.firstSeen;
        age -= age % 1000;
        data.push([
            ent.target,
            ent.recent.join(""),
            ent.security,
            ent.value,
            age,
            delta,
            ent.loot,
        ])
    }
    let tbl = fmt.table(
        data,
        ["TARGET",
          "OPS",
          ["SEC", fmt.int],
          ["VALUE", fmt.pct],
          ["START", fmt.time],
          ["LAST", fmt.time],
          ["TOTAL", fmt.money],
        ],
    );
    ns.print(tbl);
    while (hist.length > tbl.split("\n")[0].length - 10 && hist.length > 0) {
        hist.shift();
    }
    if (hist.length != 0) {
        ns.print("\n"+plot(hist, { height: 5, format: format }));
        await ns.writePort(ports.UI, `update batch ${fmt.money(hist.reduce((t, c) => t+c, 0)/hist.length)}/s`);
    }
}

/**
 * @param {string} host
 */
function newTarget(host) {
    return {
        target: host,
        recent: [],
        loot: 0,
        lastSeen: 0,
        firstSeen: Date.now(),
    };
}

/**
 * @param {NS} ns
 * @param {string} data
 */
function handleUpdate(ns, data) {
    let [ts, host, verb, target, value] = data.split("\t");
    if (!state[target]) {
        state[target] = newTarget(target);
    }

    let entry = state[target];
    entry.value = ns.getServerMoneyAvailable(target)/ns.getServerMaxMoney(target);
    entry.security = ns.getServerSecurityLevel(target)-ns.getServerMinSecurityLevel(target);
    entry.lastSeen = ts;
    entry.recent.unshift(verb[0]);
    entry.target = target;
    switch (verb) {
        case "hack":
            entry.loot += Math.floor(value);
            avg.push([ts, value]);
            break;
        case "batch":
            entry.firstSeen = ts;
            break;
    }

    state[target] = entry;
}
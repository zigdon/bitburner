import {plot} from "/lib/asciichart.js";
import * as fmt from "/lib/fmt.js";
import {getPorts} from "/lib/ports.js";

var state = new Map();
var avg = [];
var hist = [];
var format = function(n) {
    var f = fmt.money(n);
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
    var ports = getPorts();
    var lastUpdate = 0;
    while(true) {
        if (Date.now() - lastUpdate > 1000) {
            postUpdate(ns);
            lastUpdate = Date.now();
        }
        var data = ns.readPort(ports.BATCHMON);
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
function postUpdate(ns) {
    var sum = 0;
    var now = Date.now();
    avg.forEach((a) => {
        if (now - a[0] < 10000) {
            sum += Number(a[1]);
        }
    })
    avg = avg.filter((a) => { return now - a[0] < 10000 })
    hist.push(sum / 10);

    var hosts = [];
    ns.clearLog();
    for (var h of state.keys()) {
        hosts.push(h.split("/"));
    }
    
    hosts = hosts.sort((a,b) => {
        return Math.floor(a[1]) - Math.floor(b[1]);
    })
    var data = [];
    for (var h of hosts) {
        var ent = state.get(h.join("/"));
        while (ent.recent.length > 10) {
            ent.recent.pop();
        }
        var delta = now-ent.lastSeen;
        delta -= delta % 1000;
        if (delta > 1200000) {
            continue;
        } else if (delta > 600000) {
            if (ent.host == "home") {
                continue;
            }
            delta = "MIA";
        }
        var age = now-ent.firstSeen;
        age -= age % 1000;
        data.push([
            ent.host, ent.target,
            ns.getServerUsedRam(ent.host)/ns.getServerMaxRam(ent.host),
            ent.recent.join(""),
            ent.security,
            ent.value,
            age,
            delta,
            ent.loot[0],
            ent.loot[1],
            ent.loot[2],
        ])
    }
    var tbl = fmt.table(
        data,
        ["NAME", "TARGET", "MEM", "OPS", "SEC", "VALUE", "START", "LAST", "$LAST", "$RUN", "$TOTAL"],
        [null, null, fmt.pct, null, fmt.int, fmt.pct, fmt.time, fmt.time, fmt.money, fmt.money, fmt.money],
    );
    ns.print(tbl);
    while (hist.length > tbl.split("\n")[0].length - 10 && hist.length > 0) {
        hist.shift();
    }
    if (hist.length != 0) {
        ns.print("\n"+plot(hist, { height: 5, format: format }));
    }
}

/**
 * @param {string} host
 */
function newHost(host) {
    return {
        host: host,
        target: "",
        recent: [],
        counts: [0,0,0,0],
        loot: [0,0,0],
        lastSeen: 0,
        firstSeen: Date.now(),
    };
}

/**
 * @param {NS} ns
 * @param {string} data
 */
function handleUpdate(ns, data) {
    var words = data.split("\t");
    var ts = words.shift();
    var host = words.shift();
    host = host.substring(1, host.length-2);
    var verb = words.shift();
    var target = words.shift();
    var value = words.shift();
    var key = host.replace("-", "/")+"/"+target;
    if (!state.has(key)) {
        // Don't log hosts that just weaken
        if (verb[0] == "w") {
            return;
        }
        state.set(key, newHost(host));
    }

    var entry = state.get(key);
    if (target != entry.target) {
        entry.recent = [];
        entry.counts = [0, 0, 0, 0];
        entry.loot = [0, 0, 0];
    }
    entry.value = ns.getServerMoneyAvailable(target)/ns.getServerMaxMoney(target);
    entry.security = ns.getServerSecurityLevel(target)-ns.getServerMinSecurityLevel(target);
    entry.lastSeen = ts;
    entry.recent.unshift(verb[0]);
    entry.target = target;
    switch (verb) {
        case "hack":
            entry.counts[0]++;
            entry.loot[0] = Math.floor(value);
            entry.loot[1] += Math.floor(value);
            entry.loot[2] += Math.floor(value);
            avg.push([ts, value]);
            break;
        case "grow":
            entry.counts[1]++;
            break;
        case "weaken":
            entry.counts[2]++;
            break;
        case "batch":
            entry.firstSeen = ts;
            entry.loot[1] = 0;
        default:
            entry.counts[3]++;
    }

    state.set(key, entry);
}
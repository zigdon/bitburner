import * as fmt from "/lib/fmt.js";
import {getPorts} from "/lib/ports";
import {toast, netLog} from "/lib/log.js";
import {longEmp, longFact, getLocations, manualCrimeStats, getManualCrimeEV} from "/lib/constants.js";
import {newUI} from "/lib/ui.js";
import { settings } from "/lib/state.js";

const ports = getPorts();
const crimes = manualCrimeStats();
let a;
let h;
let tasks = [];
let goals;
let shopping;
let ui;
let st;

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tail();
    st = settings(ns, "sleevemgr");
    ui = await newUI(ns, "sleeve", "Sleeves");
    
    // actions: f(id, ...args)
    a = {
        crime: (id, n) => [ns.sleeve.setToCommitCrime(id, n), n],
        shockRecovery: (id) => [ns.sleeve.setToShockRecovery(id), "Recover"],
        money: (id) => makeProfit(ns, id),
        work: async (id, c) => await work(ns, id, c),
        faction: async (id, f) => await faction(ns, id, f),
        sync: (id) => [ns.sleeve.setToSynchronize(id), "Sync"],
        improve: (id) => {
            let stats = ns.sleeve.getSleeveStats(id);
            let sorted = ["hacking", "strength", "defense", "dexterity", "agility", "charisma"]
                .map(s => [s, stats[s]])
                .sort((a,b) => a[1]-b[1]);
            let lowest = sorted[0][0];
            return a.train(id, lowest);
        },
        train: (id, stat) => {
            ns.sleeve.travel(id, "Sector-12");
            switch(stat.substr(0, 3)) {
                case "hac":
                    return [ns.sleeve.setToUniversityCourse(id, "rothman university", "algorithms"), "Hacking"];
                case "cha":
                    return [ns.sleeve.setToUniversityCourse(id, "rothman university", "leadership"), "Charisma"];
                case "str":
                    return [ns.sleeve.setToGymWorkout(id, "powerhouse gym", "strength"), "Strength"];
                case "def":
                    return [ns.sleeve.setToGymWorkout(id, "powerhouse gym", "defense"), "Defense"];
                case "dex":
                    return [ns.sleeve.setToGymWorkout(id, "powerhouse gym", "dexterity"), "Dexterity"];
                case "agi":
                    return [ns.sleeve.setToGymWorkout(id, "powerhouse gym", "agility"), "Agility"];
                default:
                    ns.tprint(`Unknown stat ${stat}`);
                    return [false, "N/A"];
            }
        },
    }
    
    // helpers: id, ...args
    h = {
        minCombat: (id) => h.minStat(id, ["strength", "defense", "dexterity", "agility"]),
        minStat: (id, l) => Math.min(l.map(s => ns.sleeve.getSleeveStats(id)[s])),
        getStat: (id, stat) => ns.sleeve.getSleeveStats(id)[stat],
        hasStat: (id, stat, thresh) => ns.sleeve.getSleeveStats(id)[stat] >= thresh,
        pHasStat: (id, stat, thresh) => {
            ns.tprintf("Player %s %s >? %s", stat, ns.getPlayer()[stat], thresh)
            return ns.getPlayer()[stat] >= thresh},
    }
    shopping = {
        "karma": ["crime"],
        "train": ["abilities"],
        "combat": ["abilities"],
        "profit": ["crime", "abilities"],
        "work": ["work", "abilities"],
        "faction": ["faction", "abilities"],
    };

    goals = {
        "karma": [
            {name: "sync", action: a.sync, end: (id) => h.hasStat(id, "sync", 50)},
            {name: "de-shock", action: a.shockRecovery, end: (id) => h.getStat(id, "shock") < 75},
            {name: "de-shock", action: a.shockRecovery,
            end: (id) => h.getStat(id, "shock") == 0 || Math.random() > 0.5},
            {name: "str", action: a.train, args: ["strength"], end: (id, stat) => h.hasStat(id, stat, 50)},
            {name: "def", action: a.train, args: ["defense"], end: (id, stat) => h.hasStat(id, stat, 50)},
            {name: "dex", action: a.train, args: ["dexterity"], end: (id, stat) => h.hasStat(id, stat, 50)},
            {name: "agi", action: a.train, args: ["agility"], end: (id, stat) => h.hasStat(id, stat, 50)},
            {name: "sync", action: a.sync, end: (id) => h.hasStat(id, "sync", 100) || Math.random() > 0.05},
            {name: "murder", action: a.crime, args: ["homicide"], end: () => ns.gang.inGang()},
        ],
        "train": [
            {name: "sync", action: a.sync, end: (id) => h.hasStat(id, "sync", 50)},
            {name: "de-shock", action: a.shockRecovery, end: (id) => h.getStat(id, "shock") < 75},
            {name: "de-shock", action: a.shockRecovery,
            end: (id) => h.getStat(id, "shock") == 0 || Math.random() > 0.5},
            {name: "train", action: a.train, end: (id, stat, val) => h.hasStat(id, stat, val)}
        ],
        "faction": [
            {name: "faction", action: a.faction},
        ],
        "work": [
            {name: "work", action: a.work},
        ],
        "profit": [
            {name: "sync", action: a.sync, end: (id) => h.hasStat(id, "sync", 100)},
            {name: "improve", action: a.improve, end: () => Math.random() > 0.2 },
            {name: "crime", action: a.money},
        ],
        "combat": [
            {name: "str", action: a.train, args: ["strength"], end: (id, stat, val) => h.hasStat(id, stat, val || h.minCombat(id))},
            {name: "def", action: a.train, args: ["defense"], end: (id, stat, val) => h.hasStat(id, stat, val || h.minCombat(id))},
            {name: "dex", action: a.train, args: ["dexterity"], end: (id, stat, val) => h.hasStat(id, stat, val || h.minCombat(id))},
            {name: "agi", action: a.train, args: ["agility"], end: (id, stat, val) => h.hasStat(id, stat, val || h.minCombat(id))},
        ],
        "pcombat": [
            {name: "str", action: a.train, args: ["strength"], end: (id, stat, val) => h.pHasStat(id, stat, val)},
            {name: "def", action: a.train, args: ["defense"], end: (id, stat, val) => h.pHasStat(id, stat, val)},
            {name: "dex", action: a.train, args: ["dexterity"], end: (id, stat, val) => h.pHasStat(id, stat, val)},
            {name: "agi", action: a.train, args: ["agility"], end: (id, stat, val) => h.pHasStat(id, stat, val)},
        ],
        "recover": [
            {name: "sync", action: a.sync, end: (id) => h.hasStat(id, "sync", 100)},
            {name: "de-shock", action: a.shockRecovery, end: (id) => h.getStat(id, "shock") == 0},
        ],
        "idle": [
            {name: "sync", action: a.sync, end: (id) => h.hasStat(id, "sync", 100)},
            {name: "de-shock", action: a.shockRecovery, end: (id) => h.getStat(id, "shock") == 0},
            {name: "crime", action: a.crime, args: ["Mug"], end: () => false},
        ],
    };

    loadTasks(ns);
    let last = [];
    while (true) {
        await checkCtl(ns);
        let now = Date.now();
        let eq = 0;
        for (let s=0; s < ns.sleeve.getNumSleeves(); s++) {
            last[s] ||= 0;
            if (now - last[s] < 5000) { continue }
            let info = ns.sleeve.getInformation(s);
            if (!info.timeWorked
                || (ns.sleeve.getTask(s).task == "Crime" ?
                        info.timeWorked < 1000 :
                        now-last[s] > 10000)) {
                if (ns.sleeve.getSleeveStats(s).shock == 0) {
                    eq += await shop(ns, s);
                }
                await doTasks(ns, s);
                last[s] = now;
            }
        }
        if (eq > 0) {
            await toast(ns, "Spent %s on sleeve augs", fmt.money(eq));
        }

        await printInfo(ns);
        await ns.sleep(500);
    }
}

/**
 * @param {NS} ns
 * @param {number} id
 */
async function shop(ns, id) {
    if (ns.sleeve.getSleevePurchasableAugs(id).length == 0) {
        return;
    }
    const focus = shopping[tasks[id].goal];
    if (!focus) {
        return;
    }
    let allAttrs = {
        "abilities": ["hacking", "strength", "defense", "dexterity", "agility", "charisma"].map(a => [a+"_exp_mult", a+"_mult"]),
        "crime": ["crime_money_mult", "crime_success_mult"],
        "work": ["work_money_mult", "company_rep_mult"],
        "faction": ["faction_rep_mult"],
    }
    let attrs = focus.map(f => allAttrs[f]).flat(2);

    let augs = ns.sleeve.getSleevePurchasableAugs(id)
        .map(a => [a.name, a.cost, ns.getAugmentationStats(a.name)])
        .filter(a => a[1] <= st.get("limit"))
        .filter(a => !attrs.every(t => !a[2][t]))
        .sort((a,b) => a[1]-b[1])
    let total = 0;
    while (augs[0] && augs[0][1] < ns.getServerMoneyAvailable("home")) {
        let a = augs.shift();
        if (ns.sleeve.purchaseSleeveAug(id, a[0])) {
            await netLog(ns, "bought %s for #%d for %s", a[0], id, fmt.money(a[1]));
            total += a[1];
        }
    }

    return total;
}

/**
 * @param {NS} ns
 * @param {number} id
 */
async function doTasks(ns, id) {
    let task = tasks[id];
    if (!task) {
        tasks[id] = {id: id, goal: "idle", args: [], current: []};
        task = tasks[id];
    }

    let goal = goals[task.goal];
    if (!goal) {
        ns.tprintf("Unknown goal for sleeve #%d: %s", id, goal);
        task.goal = "idle";
        goal = goals["idle"];
    }

    for (let g of goal) {
        let args = [];
        if (g.args) {
            args.push(...g.args);
        }
        if (task.args) {
            args.push(...task.args);
        }
        if (g.end && g.end(id, ...args)) {
            continue;
        }
        if (!g.action) {
            task.current = ["sync"];
            ns.sleeve.setToSynchronize(id);
            return true;
        }
        // Don't interrupt crimes
        let curTask = ns.sleeve.getTask(id);
        if (args[0] && curTask.crime && args[0].toLowerCase() == curTask.crime.toLowerCase()) {
            return true;
        }
        let [ok, label] = await g.action(id, ...args);
        if (ok) {
            task.current = [g.name, label];
            return true;
        } else {
            ns.tprintf("Sleeve #%d couldn't perform %s, idling", id, g.name)
            task.goal = "idle";
        }
    }

    await toast(ns, "Sleeve #%d done with goal %s", id, tasks[id].goal);
    task.goal = "idle";
    return true;
}

/**
 * @param {NS} ns
 */
async function saveTasks(ns) {
    await ns.write("/conf/sleeves.txt", JSON.stringify([tasks]), "w");
}

/**
 * @param {NS} ns
 */
function loadTasks(ns) {
    if (ns.fileExists("/conf/sleeves.txt")) {
        [tasks] = JSON.parse(ns.read("/conf/sleeves.txt"));
    }
    while (tasks.length < ns.sleeve.getNumSleeves()) {
        tasks.push({id: tasks.length, goal: "idle", args: [], current: []});
    }
}

/**
 * @param {NS} ns
 */
async function checkCtl(ns) {
    let cmd = ns.readPort(ports.SLEEVEMGR);
    if (cmd.startsWith("NULL")) {
        return;
    }
    let words = cmd.split(" ");
    switch (words[0]) {
        case "task":
            let ids = words[1];
            if (ids.toLowerCase() == "all") {
                ids = "0-" + ns.sleeve.getNumSleeves();
            }
            let sIDs = [];
            if (ids.includes("-")) {
                let [start, end] = ids.split("-");
                if (start > end) { [start, end] = [end, start] }
                for (let i = start; i <= end; i++) {
                    sIDs.push(i);
                }
            } else {
                sIDs = ids.split("");
            }
            for (let id of sIDs) {
                if (!tasks[id]) {
                    tasks[id] = {id: id, goal: words[2], args: words.slice(3), current: []};
                } else {
                    tasks[id].goal = words[2];
                    tasks[id].args = words.slice(3);
                }
                ns.tprintf("Setting sleeve #%d to %s (%s)", id, words[2], words.slice(3));
            }
            break;
        case "restart":
            await toast(ns, "Restarting sleevemgr...");
            ns.spawn(ns.getScriptName());
            break;
        default:
            ns.tprint(`Unknown command: ${cmd}`);
    }
    await saveTasks(ns);
}

let hist = [];

/**
 * @param {NS} ns
 */
async function printInfo(ns) {
    let data = [];
    let cur = {profits: 0, timestamp: Date.now()};

    for (let s=0; s<ns.sleeve.getNumSleeves(); s++) {
        const stats = ns.sleeve.getSleeveStats(s);
        const task = ns.sleeve.getTask(s);
        const augs = ns.sleeve.getSleeveAugmentations(s).length;
        const info = ns.sleeve.getInformation(s);
        cur.profits += info.earningsForPlayer.workMoneyGain;
        let details;
        switch (task.task) {
            case "Crime":
                details = task.crime;
                break;
            case "Gym":
                details = task.gymStatType;
                break;
            case "Faction":
                details = `${task.factionWorkType}@${task.location}`;
                break;
            default:
                details = tasks[s].current[1];
                break;
        }
        data.push([
            s, tasks[s].goal, task.task, details, info.timeWorked, ...Object.values(stats), augs,
        ])
    }
    hist.push(cur);
    let now = Date.now();
    while (now - hist[0].timestamp > 600000) {
        hist.shift();
    }
    let rate = (cur.profits - hist[0].profits)/(now - hist[0].timestamp)*1000;
    await ui.update(`${fmt.money(rate)}/s`);

    ns.clearLog();
    ns.print(fmt.table(
        data,
        ["#", "GOAL", "TASK", "DETAILS", ["BUSY", fmt.time], ["SHOCK", fmt.large], ["SYNC", fmt.large], "HACK", "STR", "DEF", "DEX", "AGI", "CHA", "AUGS"],
    ))
}

/**
 * @param {NS} ns
 * @param {number} id
 */
function makeProfit(ns, id) {
    const stats = ns.sleeve.getSleeveStats(id);
    const evs = crimes.map(c => ({name: c.name, ev: getManualCrimeEV(c.name, stats)})).sort((a,b) => b.ev-a.ev);
    return [ns.sleeve.setToCommitCrime(id, evs[0].name), evs[0].name];
}

/**
 * @param {NS} ns
 * @param {number} id
 * @param {string} faction
 */
async function faction(ns, id, fact) {
    fact = longFact(fact);
    return [ns.sleeve.setToFactionWork(id, fact, "hacking"), fact];
}

/**
 * @param {NS} ns
 * @param {number} id
 * @param {string} company
 */
async function work(ns, id, company) {
    const emp = longEmp(company);
    for (let [loc, places] of Object.entries(getLocations())) {
        if (places.indexOf(emp) > -1) {
            if (ns.sleeve.getInformation(id).city != loc) {
                await toast(ns, "Sleeve #%d travelling to %s", id, loc);
                ns.sleeve.travel(id, loc);
            }
            break;
        }
    }
    return [ns.sleeve.setToCompanyWork(id, emp), emp];
}
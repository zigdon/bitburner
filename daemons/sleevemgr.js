import * as fmt from "/lib/fmt.js";
import {getPorts} from "/lib/ports";

var ports = getPorts();
var a;
var h;
var tasks = [];
var goals;


/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tail();
    
    // actions: id, ...args
    a = {
        murder: (id) => ns.sleeve.setToCommitCrime(id, "homicide"),
        shockRecovery: (id) => ns.sleeve.setToShockRecovery(id),
        shoplift: (id) => ns.sleeve.setToCommitCrime(id, "shoplift"),
        sync: (id) => ns.sleeve.setToSynchronize(id),
        train: (id, stat) => {
            ns.sleeve.travel(id, "Sector-12");
            switch(stat.substr(0, 3)) {
                case "hac":
                    return ns.sleeve.setToUniversityCourse(id, "rothman university", "algorithms");
                case "cha":
                    return ns.sleeve.setToUniversityCourse(id, "rothman university", "leadership");
                case "str":
                    return ns.sleeve.setToGymWorkout(id, "powerhouse gym", "strength");
                case "def":
                    return ns.sleeve.setToGymWorkout(id, "powerhouse gym", "defense");
                case "dex":
                    return ns.sleeve.setToGymWorkout(id, "powerhouse gym", "dexterity");
                case "agi":
                    return ns.sleeve.setToGymWorkout(id, "powerhouse gym", "agility");
                default:
                    ns.tprint(`Unknown stat ${stat}`);
                    return false;
            }
        },
    }
    
    // helpers: id, ...args
    h = {
        getStat: (id, stat) => ns.sleeve.getSleeveStats(id)[stat],
        hasStat: (id, stat, thresh) => ns.sleeve.getSleeveStats(id)[stat] >= thresh,
    }
    var timer = [];
    goals = {
        "karma": [
            {name: "sync", action: a.sync, end: (id) => h.hasStat(id, "sync", 50)},
            {name: "de-shock", action: a.shockRecovery,
            end: (id) => 
               ["strength", "defense", "dexterity", "agility"]
               .reduce((a, c) => a && h.getStat(id, c, 50), true)
               || h.getStat(id, "shock") <= 50},
            {name: "str", action: a.train, args: ["strength"], end: (id, stat) => h.hasStat(id, stat, 50)},
            {name: "def", action: a.train, args: ["defense"], end: (id, stat) => h.hasStat(id, stat, 50)},
            {name: "dex", action: a.train, args: ["dexterity"], end: (id, stat) => h.hasStat(id, stat, 50)},
            {name: "agi", action: a.train, args: ["agility"], end: (id, stat) => h.hasStat(id, stat, 50)},
            {name: "sync", action: a.sync, end: (id) => h.hasStat(id, "sync", 100) || Math.random() > 0.1},
            {name: "murder", action: a.murder, end: () => ns.gang.inGang()},
        ],
        "idle": [
            {name: "sync", action: a.sync, end: (id) => h.hasStat(id, "sync", 50)},
            {name: "de-shock", action: a.shockRecovery, end: (id) => h.getStat(id, "shock") == 0},
            {name: "sync", action: a.sync, end: (id) => h.hasStat(id, "sync", 0)},
            {name: "shoplift", action: a.shoplift},
        ],
    };

    loadTasks(ns);
    var lastDo = 0;
    while (true) {
        await checkCtl(ns);
        if (Date.now() - lastDo > 10000) {
            for (var s=0; s < ns.sleeve.getNumSleeves(); s++) {
                await doTasks(ns, s);
            }
            lastDo = Date.now();
        }

        printInfo(ns);
        await ns.sleep(500);
    }
}

/**
 * @param {NS} ns
 * @param {number} id
 */
async function doTasks(ns, id) {
    var task = tasks[id];
    if (!task) {
        tasks[id] = {id: id, goal: "idle", args: []};
        task = tasks[id];
    }

    var goal = goals[task.goal];
    if (!goal) {
        ns.tprintf("Unknown goal for sleeve #%d: %s", id, goal);
        tasks[id].goal = "idle";
        goal = goals["idle"];
    }

    for (var g of goal) {
        var args = task.args.length > 0 ? task.args : g.args || [];
        if (g.end && g.end(id, ...args)) {
            continue;
        }
        if (!g.action) {
            ns.sleeve.setToSynchronize(id);
            return;
        }
        if (g.action(id, ...args)) {
            return;
        } else {
            ns.tprintf("Sleeve #%d couldn't perform %s, idling", id, g.name)
            tasks[id].goal = "idle";
        }
    }
}

/**
 * @param {NS} ns
 */
async function saveTasks(ns) {
    await ns.write("/conf/sleeves.txt", JSON.stringify(tasks), "w");
}

/**
 * @param {NS} ns
 */
function loadTasks(ns) {
    if (ns.fileExists("/conf/sleeves.txt")) {
        tasks = JSON.parse(ns.read("/conf/sleeves.txt"));
    }
    while (tasks.length < ns.sleeve.getNumSleeves()) {
        tasks.push({id: tasks.length, goal: "idle", args: []});
    }
}

/**
 * @param {NS} ns
 */
async function checkCtl(ns) {
    var cmd = ns.readPort(ports.SLEEVEMGR);
    if (cmd.startsWith("NULL")) {
        return;
    }
    var words = cmd.split(" ");
    switch (words[0]) {
        case "task":
            var id = Number(words[1]);
            tasks[id] = {id: id, goal: words[2], args: words.splice(3)};
            break;
        default:
            ns.tprint(`Unknown command: ${cmd}`);
    }
    await saveTasks(ns);
}

/**
 * @param {NS} ns
 */
function printInfo(ns) {
    var data = [];
    for (var s=0; s<ns.sleeve.getNumSleeves(); s++) {
        var stats = ns.sleeve.getSleeveStats(s);
        var task = ns.sleeve.getTask(s);
        var details;
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
                details = "?";
        }
        data.push([
            s, tasks[s].goal, task.task, details, ...Object.values(stats),
        ])
    }

    ns.clearLog();
    ns.print(fmt.table(
        data,
        ["#", "GOAL", "TASK", "DETAILS", ["SHOCK", fmt.large], ["SYNC", fmt.large], "HACK", "STR", "DEF", "DEX", "AGI", "CHA"],
    ))
}
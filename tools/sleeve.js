import * as fmt from "/lib/fmt.js";
import {getManualCrimeNames, getManualCrimeEV} from "/lib/constants.js";

/** @param {NS} ns **/
export async function main(ns) {
    let cmd = ns.args.shift();
    switch(cmd) {
        case "list":
            listSleeves(ns);
            break;
        case "info":
            listSleeve(ns, ns.args.shift());
            break;
        case "ev":
            listEV(ns, ns.args.shift());
            break;
        case "augs":
            listAugs(ns, ns.args.shift(), ns.args.shift());
            break;
        case "task":
            let id = ns.args.shift();
            let task = ns.args.shift();
            if (id == "ALL") {
                for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
                    assign(ns, i, task);
                }
            } else {
                assign(ns, id, task);
            }
            break;
        default:
            ns.tprintf("Dunno what to do with %s", cmd);
    }
}

/**
 * @param {NS} ns
 * @param {number} id
 * @param {string} filter
 */
function listAugs(ns, filter="", id=0) {
    let augs = ns.sleeve.getSleeveAugmentations(id);
    augs.push(...ns.sleeve.getSleevePurchasableAugs());
    ns.tprintf("Available augs to sleeve #%s:", id)
    let data = [];
    for (let a of augs.map(a => [a, ns.getAugmentationStats(a.name)])) {
        if (filter && Object.keys(a[1]).every(k => !k.includes(filter))) {
            continue;
        }
        data.push([ 
            a[0].name, ns.getAugmentationPrice(a[0].name), Object.entries(a[1]).map(s => `${s[0]}: ${s[1]}`).join(", "),
        ]) 
    }
    ns.tprintf(fmt.table(data, ["name", ["price", fmt.money], "effects"]));
}

/**
 * @param {NS} ns
 * @param {number} id
 */
function listEV(ns, id) {
    let stats = ns.sleeve.getSleeveStats(id);
    let crimes = getManualCrimeNames().map(c => [c, getManualCrimeEV(c, stats)]).sort((a,b) => b[1]-a[1]);
    ns.tprintf(fmt.table(crimes, ["CRIME", ["EV", fmt.large]]));
}

/**
 * @param {NS} ns
 * @param {number} id
 * @param {string} task
 */
function assign(ns, id, task) {
    let stats = ns.sleeve.getSleeveStats(id);
    if (task == "karma") {
        for (let s of ["agility", "defense", "dexterity", "strength"]) {
            if (stats[s] < 20) {
                ns.tprintf("Sending #%d to train %s", id, s);
                ns.sleeve.setToGymWorkout(id, "powerhouse gym", s)
                return;
            }
        }
        ns.tprintf("Sending #%d to murderbot", id);
        ns.sleeve.setToCommitCrime(id, "Homicide");
    }
}

/**
 * @param {NS} ns
 */
function listSleeves(ns) {
    let data = [];
    for (let s=0; s<ns.sleeve.getNumSleeves(); s++) {
        listSleeve(ns, s)
        let stats = ns.sleeve.getSleeveStats(s);
        let task = ns.sleeve.getTask(s);
        data.push([
            s, task.task, task.task == "Crime" ? task.crime : "?", ...Object.values(stats),
        ])
    }

    ns.tprintf(fmt.table(
        data,
        ["#", "TASK", "DETAILS", ...Object.keys(ns.sleeve.getSleeveStats(0))],
    ))
}

/**
 * @param {NS} ns
 * @param {number} id
 */
function listSleeve(ns, s) {
    let stats = ns.sleeve.getSleeveStats(s);
    let augs = ns.sleeve.getSleeveAugmentations(s);
    let info = ns.sleeve.getInformation(s);
    let buyable = ns.sleeve.getSleevePurchasableAugs(s);
    let task = ns.sleeve.getTask(s);
    ns.tprintf("Sleeve #%d", s);
    ns.tprint(fmt.object(stats));
    ns.tprint(augs);
    ns.tprint(fmt.object(buyable));
    ns.tprint(fmt.object(info));
    ns.tprint(fmt.object(task));
}
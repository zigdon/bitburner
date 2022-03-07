import * as fmt from "/lib/fmt.js";
import {getManualCrimeNames, getManualCrimeEV} from "/lib/constants.js";

/** @param {NS} ns **/
export async function main(ns) {
    var cmd = ns.args.shift();
    switch(cmd) {
        case "list":
            listSleeves(ns);
            break;
        case "info":
            listSleeve(ns, ns.args.shift());
            break;
        case "ev":
            listEV(ns, ns.args.shift());
        case "task":
            var id = ns.args.shift();
            var task = ns.args.shift();
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
 */
function listEV(ns, id) {
    var stats = ns.sleeve.getSleeveStats(id);
    var crimes = getManualCrimeNames().map(c => [c, getManualCrimeEV(c, stats)]).sort((a,b) => b[1]-a[1]);
    ns.tprintf(fmt.table(crimes, ["CRIME", ["EV", fmt.large]]));
}

/**
 * @param {NS} ns
 * @param {number} id
 * @param {string} task
 */
function assign(ns, id, task) {
    var stats = ns.sleeve.getSleeveStats(id);
    if (task == "karma") {
        for (var s of ["agility", "defense", "dexterity", "strength"]) {
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
    var data = [];
    for (var s=0; s<ns.sleeve.getNumSleeves(); s++) {
        listSleeve(ns, s)
        var stats = ns.sleeve.getSleeveStats(s);
        var task = ns.sleeve.getTask(s);
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
    var stats = ns.sleeve.getSleeveStats(s);
    var augs = ns.sleeve.getSleeveAugmentations(s);
    var info = ns.sleeve.getInformation(s);
    var buyable = ns.sleeve.getSleevePurchasableAugs(s);
    var task = ns.sleeve.getTask(s);
    ns.tprintf("Sleeve #%d", s);
    ns.tprint(fmt.object(stats));
    ns.tprint(augs);
    ns.tprint(fmt.object(buyable));
    ns.tprint(fmt.object(info));
    ns.tprint(fmt.object(task));
}
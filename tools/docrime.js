import * as fmt from "/lib/fmt.js";
import {keep} from "/lib/log.js";
import {getPorts} from "/lib/ports.js";

const crimes = [
    "shoplift",
    "rob store",
    "mug someone",
    "larceny",
    "deal drugs",
    "bond forgery",
    "traffick illegal arms",
    "homicide",
    "grand theft auto",
    "kidnap and ransom",
    "assassinate",
    "heist",
];

/**
 * @param {NS} ns
 * @param {string} priority
 **/
function getCrimeValues(ns, priority) {
    const crimeValues = {};
    for (let crime of crimes) {
        const crimeStats = ns.getCrimeStats(crime);
        // using endswith lets us use 'exp' or 'xp' to combine all stat xp
        var relevantKeys;
        if (priority.includes("_")) {
            const stats = priority.split("_")[0];
            relevantKeys = Object.keys(crimeStats).filter((k) => k.startsWith(stats));
        } else {
            relevantKeys = Object.keys(crimeStats).filter((k) => k.endsWith(priority));
        }
        const relevantValues = relevantKeys.map((k) => crimeStats[k]);
        crimeValues[crime] = relevantValues.reduce((a, b) => a + b) / crimeStats.time;
    }
    return crimeValues;
}

/** @param {NS} ns **/
async function checkStats(ns) {
    const gym = "powerhouse gym";
    for (var name of [ "strength",  "defense",  "dexterity",  "agility"]) {
        var p = ns.getPlayer();
        while (p[name] < 50) {
            ns.tail();
            ns.gymWorkout(gym, name, ns.isFocused());
            await ns.sleep(100);
            p = ns.getPlayer();
        }
        ns.stopAction()
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("asleep");

    await checkStats(ns);

    // possible priorities: karma, kills, money, STAT_exp, xp
    const priority = ns.args[0] || "money";
    const crimeValues = getCrimeValues(ns, priority);
    const ev = priority.endsWith("xp") ?
        // you get half xp for failing a crime
        (crime) => {
            const chance = ns.getCrimeChance(crime);
            return (crimeValues[crime] * chance) +
                (crimeValues[crime]/2 * (1 - chance));
        } :
        // other rewards only happen if you succeed
        (crime) => crimeValues[crime] * ns.getCrimeChance(crime);
    const startFact = ns.getPlayer().currentWorkFactionName;
    var startWork = "";
    switch (ns.getPlayer().currentWorkFactionDescription) {
        case "carrying out field missions":
            startWork = "Field Work";
            break;
    }
    ns.atExit(() => {
        try {
            if (startFact) {
                ns.stopAction();
                ns.workForFaction(startFact, "Field Work", false);
            }
        } catch {}
    })
    while (true) {
        // do this inside the loop because success chance changes
        crimes.sort((a, b) => ev(b) - ev(a));
        // if we don't keep tail up it's hard to stop this script
        ns.tail();
        ns.print(`Expected rate: ${fmt.large(ev(crimes[0])*1000)} ${priority}/s`);
        if (priority == "karma") {
            ns.print(`Karma: ${fmt.large(ns.heart.break())}`);
            ns.print(`Kills: ${fmt.large(ns.getPlayer().numPeopleKilled)}`);
        }
        ns.commitCrime(crimes[0]);
        while (ns.isBusy()) {
            await ns.asleep(10);
        }
        if (priority == "karma" && ns.gang.createGang("Slum Snakes")) {
            var player = ns.getPlayer();
            await keep(ns, "Gang created %s into BN%d", fmt.time(player.playtimeSinceLastBitnode), player.bitNodeN);
            ns.tprintf("Gang created %s into the node", player.playtimeSinceLastBitnode);
            let port = getPorts().GANGMGR;
            await ns.writePort(port, "focus respect");
            await ns.writePort(port, "limit 50m");
            ns.spawn("/daemons/gangmgr.js");
        }
    }
}
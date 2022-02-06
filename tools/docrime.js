import * as fmt from "/lib/fmt.js";

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
        const relevantKeys = Object.keys(crimeStats).filter((k) => k.endsWith(priority));
        const relevantValues = relevantKeys.map((k) => crimeStats[k]);
        crimeValues[crime] = relevantValues.reduce((a, b) => a + b) / crimeStats.time;
    }
    return crimeValues;
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("asleep");
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
    ns.atExit(() => {
        if (startFact) {
            ns.stopAction();
            ns.workForFaction(startFact, "Security Work", false);
        }
    })
    while (true) {
        // do this inside the loop because success chance changes
        crimes.sort((a, b) => ev(b) - ev(a));
        // if we don't keep tail up it's hard to stop this script
        ns.tail();
        ns.clearLog();
        ns.print(`Expected rate: ${fmt.large(ev(crimes[0])*1000)} ${priority}/s`);
        await ns.commitCrime(crimes[0]);
        while (ns.isBusy()) {
            await ns.asleep(10);
        }
    }
}
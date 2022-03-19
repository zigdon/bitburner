import * as fmt from "/lib/fmt.js";
import {cities} from "/lib/constants.js";
import {toast} from "/lib/log.js";
import {newUI} from "/lib/ui.js";

let ui;
const types = (ns) => [
    ['General', ns.bladeburner.getGeneralActionNames],
    ['Contract', ns.bladeburner.getContractNames],
    ['Operation', ns.bladeburner.getOperationNames],
    ['Black Ops', ns.bladeburner.getBlackOpNames],
];

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    let lastHP = ns.getPlayer().hp;
    let maxDmg = 5;
    ui = await newUI(ns, "bladeburner", "BB");
    while (true) {
        await pickActivity(ns);
        await spendSkills(ns);
        await printInfo(ns);

        if (lastHP - ns.getPlayer().hp > maxDmg) {
            maxDmg = lastHP - ns.getPlayer().hp;
            await toast(ns, "Increasing max damage to %d", maxDmg);
        }
        if (ns.getPlayer().hp <= maxDmg) {
            await toast(ns, `Low HP, sending to hospital: ${fmt.money(ns.hospitalize())}`);
        }
        await ns.sleep(500);
    }
}

/** @param {NS} ns */
async function spendSkills(ns) {
    let skills = [
        "Blade's Intuition",
        "Cloak",
        "Short-Circuit",
        "Tracer",
        "Overclock",
        "Reaper",
        "Evasive System",
        "Hands of Midas",
        "Hyperdrive",
        "Datamancer",
        "Digital Observer",
    ].map(s => [s, ns.bladeburner.getSkillUpgradeCost(s)]).sort((a,b) => a[1]-b[1]);
    if (skills[0][1] < ns.bladeburner.getSkillPoints()) {
        await toast(ns, "Upgrading %s for %d SP", skills[0][0], skills[0][1]);
        ns.bladeburner.upgradeSkill(skills[0][0]);
    }
}

let recruiting = 0;
/** @param {NS} ns */
async function pickActivity(ns) {
    let act;
    // If another city is significantly more populous, go there
    let curPop = ns.bladeburner.getCityEstimatedPopulation(ns.bladeburner.getCity());
    let dest = cities
        .map(c => [c, ns.bladeburner.getCityEstimatedPopulation(c)])
        .filter(c => c[1] > curPop*1.1)
        .sort((a,b) => b[1]-a[1])
        .map(c => c[0])[0];
    if (dest) {
        await toast(ns, "Bladeburner travelling to %s", dest);
        ns.bladeburner.switchCity(dest);
    }

    // set the max team size, also discover how big is our team
    let team = 0;
    for (let op of ns.bladeburner.getOperationNames()) {
        if (team) {
            ns.bladeburner.setTeamSize("Operations", op, team);
        } else {
            let n = 1;
            while (true) {
                await ns.sleep(1);
                let assigned = ns.bladeburner.setTeamSize("Operation", op, n)
                if (n != assigned) {
                    team = assigned;
                    await netLog(ns, "Team size: %d", team);
                    break;
                }
                n++;
            }
        }
    }

    // chaos > 50 starts imposing success penalties
    // As does stamina at < 50%
    // Recruit sometimes if we have less than 100 team members
    let [curStam, maxStam] = ns.bladeburner.getStamina();
    if (ns.bladeburner.getCityChaos(ns.bladeburner.getCity()) > 45) {
        act = ["General", "Diplomacy"];
    } else if (recruiting == team || ns.bladeburner.getActionEstimatedSuccessChance("General", "Recruitment")[0] > 50 &&  Math.random()*100 > team) {
        recruiting == team;
        act = ["General", "Recruitment"];
    } else  if (curStam < maxStam / 1.8) {
        let [min, max] = ns.bladeburner.getActionEstimatedSuccessChance("Contract", "Tracking");
        if (max-min > 25) {
            act = ["General", "Field Analysis"];
        } else if (ns.getPlayer().hp < ns.getPlayer().max) {
            act = ["General", "Hyperbolic Regeneration Chamber"];
        } else if (ns.bladeburner.getActionCountRemaining("Contract", "Tracking") < 20) {
            act = ["General", "Incite Violence"];
        } else {  // at some point, figure out if there's a cap we want for team size
            act = ["General", "Recruitment"];
        }
    } else {
        let best = types(ns).map(t => t[1]().map(a => [t[0], a])).flat(1)
            .map(a => ({
                type: a[0],
                name: a[1],
                chance: ns.bladeburner.getActionEstimatedSuccessChance(a[0], a[1]),
                count: ns.bladeburner.getActionCountRemaining(a[0], a[1]),
                val: ns.bladeburner.getActionRepGain(a[0], a[1])/ns.bladeburner.getActionTime(a[0], a[1]),
            }))
            .filter(a => a.type != "General" && a.count > 0)
            .sort((a,b) => b.chance[0]-a.chance[0] || b.val-a.val)[0];
        act = [best.type, best.name]
    }
    if (act[1] != ns.bladeburner.getCurrentAction().name) {
        ns.bladeburner.startAction(...act);
    }
}

/** @param {NS} ns */
async function printInfo(ns) {
    let stam = ns.bladeburner.getStamina();
    await ui.update(`SP: ${ns.bladeburner.getSkillPoints()}`);
    let data = [
        [
            "HP", `${ns.getPlayer().hp}/${ns.getPlayer().max_hp}`,
            "Rank", fmt.int(ns.bladeburner.getRank()),
            "SPs", ns.bladeburner.getSkillPoints(),
            "Stam", stam.map(s => fmt.int(s)).join("/"),
            "Action", ns.bladeburner.getCurrentAction().name,
        ],
    ];
    ns.clearLog();
    ns.print(fmt.table(data));

    data = [];
    for (let city of cities) {
        data.push([
            ns.bladeburner.getCity() == city ? city.toUpperCase() : city,
            ns.bladeburner.getCityChaos(city),
            ns.bladeburner.getCityEstimatedPopulation(city),
            ns.bladeburner.getCityCommunities(city),
        ]);
    }
    ns.print(fmt.table(data,
        ["City", ["Chaos", fmt.int], ["Population", fmt.large], "Communities"]
    ));

    data = [];
    for (let [type, fn] of types(ns)) {
        for (let a of fn()) {
            if (ns.bladeburner.getActionEstimatedSuccessChance(type, a)[1] < 0.05) {
                continue;
            }
            data.push([
                a,
                type,
                ns.bladeburner.getActionCountRemaining(type, a) == Infinity ? "-" : ns.bladeburner.getActionCountRemaining(type, a),
                ns.bladeburner.getActionCurrentLevel(type, a),
                ns.bladeburner.getActionEstimatedSuccessChance(type, a).map(c => (c*100).toFixed(0)).join("-"),
                ns.bladeburner.getActionRepGain(type, a).toFixed(2),
                fmt.time(ns.bladeburner.getActionTime(type, a)),
            ]);
        }
    }
    ns.print(fmt.table(data, ["name", "type", "cnt", "lvl", "chance", "rep", "time"]));
}
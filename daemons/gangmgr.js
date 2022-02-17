import * as fmt from "/lib/fmt.js";
import { toast } from "/lib/log.js";
import { getPorts } from "/lib/ports.js";
import { getCrimes } from "/lib/constants.js";

var nextTick = 0;
var ports = getPorts();
// money | respect | wanted
var focus;
var repGoal;
var buyingEq = true;
var showDetails = true;

/** @param {NS} ns **/
export async function main(ns) {
    if (!ns.gang.inGang()) {
        ns.tprintf("Not in a gang.");
        return;
    }
    ns.disableLog("sleep");
    ns.tail();
    var ports = getPorts();
    ns.clearPort(ports.GANGMGR);
    loadSettings(ns);

    await findTick(ns);

    while (true) {
        await checkRecruits(ns);
        await assignTasks(ns);
        await checkCtl(ns);
        await checkState(ns);
        await checkAsc(ns);
        if (buyingEq) {
            await buyEq(ns);
        }
        printStatus(ns);
        await ns.sleep(250);
    }
}

/**
 * @param {NS} ns
 */
async function checkState(ns) {
    if (buyingEq && ns.gang.getGangInformation().territory == 1) {
        toast(ns, "Territory at 100%, disabling buying eq", { timeout: 30000 });
        buyingEq = false;
    }
}

/**
 * @param {NS} ns
 */
async function saveSettings(ns) {
    await ns.write("/conf/gangSettings.txt", JSON.stringify([focus, repGoal, buyingEq]), "w")
}

/**
 * @param {NS} ns
 */
function loadSettings(ns) {
    if (!ns.fileExists("/conf/gangSettings.txt")) { return }
    [focus, repGoal, buyingEq] = JSON.parse(ns.read("/conf/gangSettings.txt"));
}

/**
 * @param {NS} ns
 */
async function buyEq(ns) {
    var bill = 0;
    for (var n of equipmentByCombatValue(ns)) {
        if (!n) { continue }
        var cost = ns.gang.getEquipmentCost(n);
        if (cost > 1000000000) { continue } // $1b
        for (var m of ns.gang.getMemberNames().map(m => [m, ns.gang.getMemberInformation(m)])) {
            if (m[1].augmentations.indexOf(n) == -1 && m[1].upgrades.indexOf(n) == -1 && ns.getServerMoneyAvailable("home") > cost) {
                if (ns.gang.purchaseEquipment(m[0], n)) {
                    bill += cost;
                } else {
                    await toast(ns, "Failed to buy %s for %s at %s", n, m[0], fmt.money(cost));
                }
            }
        }
    }
    if (bill > 0) {
        await toast(ns, "Spend %s on equipment", fmt.money(bill));
    }
}

/**
 * @param {NS} ns
 */
function equipmentByCombatValue(ns) {
    function getValue(eq) {
        const stats = ns.gang.getEquipmentStats(eq);
        let value = 0;
        for (let key of ["agi", "cha", "def", "dex", "str"]) {
            value += stats[key] || 0;
        }
        return value / ns.gang.getEquipmentCost(eq);
    }
    const eqNames = ns.gang.getEquipmentNames();
    eqNames.sort((a, b) => getValue(b) - getValue(a));
    return eqNames;
}

/**
 * @param {NS} ns
 */
async function checkAsc(ns) {
    for (var m of ns.gang.getMemberNames()) {
        var res = ns.gang.getAscensionResult(m);
        if (!res) {
            continue;
        }
        if ([res.str, res.def, res.dex, res.agi, res.cha, res.hack].filter(r => r >= 2).length > 1) {
            await toast(ns, "Ascending %s", m, { level: "success" });
            ns.gang.ascendMember(m);
            return;
        }
    }
}

/**
 * @param {NS} ns
 */
async function checkCtl(ns) {
    var cmd = ns.readPort(ports.GANGMGR);
    if (cmd.startsWith("NULL")) {
        return;
    }
    var words = cmd.split(" ");
    switch (words[0]) {
        case "restart":
            await toast(ns, "Gang manager restarting...");
            ns.spawn(ns.getScriptName());
            break;
        case "focus":
            focus = words[1];
            await toast(ns, "Gang focusing on %s", focus);
            await saveSettings(ns);
            break;
        case "rep":
            repGoal = fmt.parseNum(words[1])
            await toast(ns, "Rep goal set to %s", fmt.large(repGoal));
            await saveSettings(ns);
            break;
        case "buy":
            buyingEq = !buyingEq;
            break;
        case "details":
            showDetails = !showDetails;
            break;
        default:
            await toast(ns, "Gang manager unknown command %s", words[0], { level: "error" });
    }
}

/**
 * @param {NS} ns
 */
async function findTick(ns) {
    var start = Date.now();
    var last = 0;
    while (true) {
        var info = ns.gang.getOtherGangInformation();
        var pow = Object.values(info).map(v => v.power).reduce((t, p) => t + p, 0);
        if (last == 0) {
            last = pow;
        } else if (last != pow) {
            nextTick = Date.now() + 20000;
            return
        }
        if (Date.now() - start > 30000) {
            await toast(ns, "Can't find tick!", { level: "error" });
            ns.exit();
        }
        await ns.sleep(1);
    }
}

var lastPower = 0;
var noChange = 0;

/**
 * @param {NS} ns
 */
async function assignTasks(ns) {
    // anyone idle, assign training
    // weakest, assign training
    // wanted penalty > 10% -> vigilante
    // If near a warfare tick, everyone to territory!
    var members = ns.gang.getMemberNames().map(m => ns.gang.getMemberInformation(m));
    var gangInfo = ns.gang.getGangInformation();
    var otherGangs = Object.keys(ns.gang.getOtherGangInformation());

    var stats = [];
    var now = Date.now();
    if (nextTick - now < 0) {
        nextTick += 20000;
    }
    if (nextTick - now < 1000) {
        lastPower = gangInfo.power;
        if (gangInfo.territory < 1 && otherGangs.map(g => ns.gang.getChanceToWinClash(g)).every(c => c >= 0.5)) {
            ns.gang.setTerritoryWarfare(true);
        }
        members.forEach(m => ns.gang.setMemberTask(m.name, "Territory Warfare"));
        return;
    }
    if (nextTick - now > 19700) {
        if (lastPower == gangInfo.power) {
            if (noChange++ > 10) {
                await toast(ns, "No power change, recalibrating tick")
                noChange = 0;
                await findTick(ns);
            }
        } else {
            noChange = 0;
        }
    }
    ns.gang.setTerritoryWarfare(false);

    var pickTraining = (m) => {
        if (m.hack < m.cha) {
            return "Train Hacking";
        } else if (m.cha < m.str) {
            return "Train Charisma";
        } else {
            return "Train Combat";
        }
    }

    for (var m of members) {
        var plan = m.task;
        var power = [m.str, m.def, m.dex, m.agi].reduce((p, v) => p + v, 0);

        plan = bestCrime(ns, gangInfo, m)

        if (m.task == plan && m.moneyGain == 0 && m.respectGain == 0) {
            plan = pickTraining(m);
        }
        stats.push({ name: m.name, power: power, plan: plan });
    }

    stats = stats.sort((a, b) => a.power - b.power);
    stats[0].plan = pickTraining(members.find(m => m.name == stats[0].name))
    if (gangInfo.wantedLevel > 5) {
        var vigis = (0.90 - gangInfo.wantedPenalty) / 0.05;
        if (vigis > 0) {
            if (vigis >= stats.length) {
                vigis = stats.length;
            }
            for (var i = 1; i <= vigis; i++) {
                stats[stats.length - i].plan = "Vigilante Justice";
            }
        }
    }
    stats.forEach(s => ns.gang.setMemberTask(s.name, s.plan));
}

/**
 * @param {NS} ns
 * @param {GangInfo} g
 * @param {GangMemberInfo} m
 */
function bestCrime(ns, g, m) {
    var crimes = getCrimes();
    var best = "Train Combat";
    var fStat = 0;
    var focusFunc;
    switch (focus) {
        case "respect":
            focusFunc = ns.formulas.gang.respectGain;
            break;
        case "wanted":
            focusFunc = ns.formulas.gang.wantedLevelGain;
            break;
        default:
            focusFunc = ns.formulas.gang.moneyGain;
    }
    for (var c of crimes) {
        if (c.name.startsWith("Vigilante")) {
            continue;
        }
        var t = ns.gang.getTaskStats(c.name);
        var val = focusFunc(g, m, t);
        if (focus == "wanted") {
            val *= -1;
        }
        if (val > fStat) {
            fStat = val;
            best = c.name;
        }
    }

    return best;
}

/**
 * @param {NS} ns
 */
async function getName(ns) {
    var colors = ["red", "green", "white", "gray", "blue", "yellow", "orange", "purple", "black", "pink"];
    var animals = ["mouse", "rat", "snake", "elephant", "cat", "tiger", "crow", "fish", "hawk"];
    var members = ns.gang.getMemberNames();
    var start = Date.now();
    var suffix = 0;
    while (true) {
        if (Date.now() - start > 10000) {
            suffix++;
            start = Date.now();
        }
        var name = colors[Math.floor(Math.random() * colors.length)] + " " + animals[Math.floor(Math.random() * animals.length)]
        if (suffix > 0) { name += " " + suffix }
        if (members.indexOf(name) == -1) {
            return name;
        }
        await ns.sleep(50);
    }
}

/**
 * @param {NS} ns
 */
async function checkRecruits(ns) {
    if (!ns.gang.canRecruitMember()) {
        return;
    }
    var name = await getName(ns);
    if (ns.gang.recruitMember(name)) {
        await toast(ns, "New recruit %s", name);
        ns.gang.setMemberTask(name, "Train Combat");
        if (ns.gang.getMemberNames().length == 12 && focus == "respect") {
            focus = "money";
            await toast(ns, "Gang full, switching focus to money", {level: "success"})
        }
    } else {
        await toast(ns, "Couldn't recruit %s", name, { level: "error" });
    }
}

var lastRep = [];
/**
 * @param {NS} ns
 */
function printStatus(ns) {
    var stats = ns.gang.getGangInformation();
    var curRep = ns.getFactionRep(stats.faction);
    lastRep.push([curRep, Date.now()]);
    while (lastRep.length > 300) {
        lastRep.shift();
    }
    var oldRep = lastRep.reduce((p, c) => { return (!p || c[1] < p[1]) ? c : p });
    var repRate = oldRep ? (curRep - oldRep[0]) * 1000 / (Date.now() - oldRep[1]) : lastRep.length;

    var size = ns.gang.getMemberNames().length;
    var chances = Object.keys(ns.gang.getOtherGangInformation())
        .filter(g => g != stats.faction)
        .map(g => sprintf("%s: %s", fmt.initial(g),
            ns.gang.getChanceToWinClash(g) > 0.5 ? "✓" : fmt.pct(ns.gang.getChanceToWinClash(g), 2)));
    var gangData = [
        [
            "Power", fmt.large(stats.power) + (noChange > 0 ? "*" : ""),
            "$ rate", fmt.money(5 * stats.moneyGainRate) + "/s",
            "Wanted level", fmt.large(stats.wantedLevel),
            "Warfare", stats.territory < 1 ? stats.territoryWarfareEngaged : "Done",
            "Faction rep", fmt.large(curRep),
        ],
        [
            "Respect", fmt.large(stats.respect),
            "Gear", buyingEq ? "buying" : "saving",
            "Wanted rate", (5 * stats.wantedLevelGainRate).toFixed(2) + "/s",
            "Next tick", fmt.time(nextTick - Date.now()),
            "Rep rate", fmt.large(repRate) + "/s",
        ],
        [
            "Respect rate", fmt.large(5 * stats.respectGainRate, {digits:0}) + "/s",
            "Teritory", fmt.pct(stats.territory, 2),
            "Penalty", fmt.int(100 - stats.wantedPenalty * 100),
            "Clash chance", fmt.int(stats.territoryClashChance * 100),
            "Rep goal", repGoal ? fmt.large(repGoal) : "",
        ],
        [
            "Win chance", ...chances,
            "Focus: " + focus,
            "Rep ETA", repGoal ? fmt.time((repGoal - curRep) / repRate * 1000) : "",
        ],
    ];
    if (showDetails) {
        var memberData = [];
        for (var m of ns.gang.getMemberNames()) {
            var i = ns.gang.getMemberInformation(m);
            memberData.push([
                m, i.task, i.str, i.def, i.dex, i.agi, i.cha, i.hack, i.earnedRespect,
                5 * i.moneyGain, (5 * i.respectGain).toFixed(3), (5 * i.wantedLevelGain).toFixed(3),
            ])
        }
    }
    
    ns.clearLog();
    ns.print(fmt.table(gangData), "\n");
    ns.print(showDetails ? fmt.table(
        memberData,
        ["NAME", "TASK", "STR", "DEF", "DEX", "AGI", "CHA", "HACK",
            ["EARNED RSPT", fmt.int], ["$ GAIN", fmt.money], "REPT GAIN", "WANTED GAIN"],
    ) : "");

}
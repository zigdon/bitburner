import * as fmt from "/lib/fmt.js";
import { toast } from "/lib/log.js";
import { getPorts } from "/lib/ports.js";
import { getCrimes, longCrime } from "/lib/constants.js";

var nextTick = 0;
var ports = getPorts();
var defGear = {weapon: "", armor: "", vehicle: "", rootkit: "", augs: ""};
// money | respect | wanted
var focus;
var repGoal;

/** @param {NS} ns **/
export async function main(ns) {
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
        await checkAsc(ns);
        await buyEq(ns);
        printStatus(ns);
        await ns.sleep(250);
    }
}

/**
 * @param {NS} ns
 */
async function saveSettings(ns) {
    await ns.write("/conf/gangSettings.txt", JSON.stringify([defGear, focus, repGoal]), "w")
}

/**
 * @param {NS} ns
 */
function loadSettings(ns) {
    if (!ns.fileExists("/conf/gangSettings.txt"))  { return }
    [defGear, focus, repGoal] = JSON.parse(ns.read("/conf/gangSettings.txt"));
}

/**
 * @param {NS} ns
 */
async function buyEq(ns) {
    for (var [t, n] of Object.entries(defGear)) {
        if (!n) { continue }
        var cost = ns.gang.getEquipmentCost(n);
        for (var m of ns.gang.getMemberNames().map(m => [m, ns.gang.getMemberInformation(m)])) {
            if (m[1].augmentations.indexOf(n) == -1 && m[1].upgrades.indexOf(n) == -1 &&  ns.getServerMoneyAvailable("home") > cost) {
                if (ns.gang.purchaseEquipment(m[0], n)) {
                    await toast(ns, "Bought %s for %s at %s", n, m[0], fmt.money(cost));
                } else {
                    await toast(ns, "Failed to buy %s for %s at %s", n, m[0], fmt.money(cost));
                }
            }
        }
    }
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
        if ([res.str, res.def, res.dex, res.agi, res.cha, res.hack].filter(r => r >=2).length > 1) {
            await toast(ns, "Ascending %s", m, {level: "success"});
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
        case "gear":
            var type = words[1];
            var names = ns.gang.getEquipmentNames()
                .map(g => [g.toLowerCase(), ns.gang.getEquipmentType(g).toLowerCase(), g])
                .filter(g => g[0].indexOf(words[2])>-1 && g[1].indexOf(type)>-1);
            if (names.length != 1) {
                await toast(ns, "Unknown gear: %s", names);
                return;
            }
            defGear[type] = names[0][2];
            await saveSettings(ns);
            await toast(ns, "Setting default %s to %s", type, names[0][2])
            break;
        default:
            await toast(ns, "Gang manager unknown command %s", words[0], {level: "error"});
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
        var pow = Object.values(info).map(v => v.power).reduce((t, p) => t+p, 0);
        if (last == 0) {
            last = pow;
        } else if (last != pow) {
            nextTick = Date.now()+20000;
            return
        }
        if (Date.now() - start > 30000) {
            await toast(ns, "Can't find tick!", {level: "error"});
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
    if (nextTick-now < 0) {
        nextTick += 20000;
    }
    if (nextTick - now < 1000) {
        lastPower = gangInfo.power;
        if (otherGangs.map(g => ns.gang.getChanceToWinClash(g)).every(c => c >= 0.5)) {
            ns.gang.setTerritoryWarfare(true);
        }
        members.forEach(m => ns.gang.setMemberTask(m.name, "Territory Warfare"));
        return;
    }
    if (nextTick-now > 19700) {
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

        plan = bestCrime(ns, m)
        
        if (m.task == plan && m.moneyGain == 0 && m.respectGain == 0) {
            plan = pickTraining(m);
        }
        stats.push({ name: m.name, power: power, plan: plan });
    }

    stats = stats.sort((a, b) => a.power - b.power);
    stats[0].plan = pickTraining(members.find(m => m.name == stats[0].name))
    var vigis = (0.90 - gangInfo.wantedPenalty)/0.05;
    if (vigis > 0) {
        if (vigis >= stats.length) {
            vigis = stats.length;
        }
        for (var i=1; i<=vigis; i++) {
            stats[stats.length-i].plan = "Vigilante Justice";
        }
    }
    stats.forEach(s => ns.gang.setMemberTask(s.name, s.plan));
}

/**
 * @param {NS} ns
 * @param {GangMemberInfo} m
 */
function bestCrime(ns, m) {
    var crimes = getCrimes();
    var best = "Train Combat";
    var fStat = 0;
    for (var c of crimes) {
        if (c.name.startsWith("Vigilante")) {
            continue;
        }
        if (
            m.str > 2*c.str &&
            m.def > 2*c.def &&
            m.dex > 2*c.dex &&
            m.agi > 2*c.agi &&
            m.cha > 2*c.cha &&
            m.hack > 2*c.hack
        ) {
            if (focus == "money" && c.money > fStat) {
                fStat = c.money;
                best = c.name;
            } else if (focus == "respect" && c.respect > fStat) {
                fStat = c.respect;
                best = c.name;
            } else if (focus == "wanted" && c.wanted > fStat) {
                fStat = c.wanted;
                best = c.name;
            } else if (!focus) {
                best = c.name;
            }
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
    } else {
        await toast(ns, "Couldn't recruit %s", name, { level: "error" });
    }
}

var lastRep = [];
/**
 * @param {NS} ns
 */
function printStatus(ns) {
    var shorten = (n) => {
        var words = n.split(" ");
        var model = words.filter(w => w.match(/[0-9]/));
        if (model.length>0) {
            return model[0];
        }
        return words.map(w => w[0]).join("");
    }
    var stats = ns.gang.getGangInformation();
    var curRep = ns.getFactionRep(stats.faction);
    lastRep.push([curRep, Date.now()]);
    while (lastRep.length > 300) {
        lastRep.shift();
    }
    var oldRep = lastRep.reduce((p, c) => {return (!p || c[1] < p[1]) ? c : p });
    var repRate = oldRep ? (curRep-oldRep[0])*1000/(Date.now() - oldRep[1]) : lastRep.length;

    var size = ns.gang.getMemberNames().length;
    var chances = Object.keys(ns.gang.getOtherGangInformation())
        .filter(g => g != stats.faction)
        .map(g => sprintf("%s: %s", fmt.initial(g), fmt.pct(ns.gang.getChanceToWinClash(g), 2)));
    var gangData = [
        [
            "Power", fmt.large(stats.power),
            "$ rate", fmt.money(5 * stats.moneyGainRate) + "/s",
            "Wanted level", fmt.large(stats.wantedLevel),
            "Warfare", stats.territoryWarfareEngaged,
            "Faction rep", fmt.large(curRep),
        ],
        [
            "Respect", fmt.large(stats.respect),
            "Recruit?", size < 12 ? ns.gang.canRecruitMember() : "max",
            "Wanted rate", (5 * stats.wantedLevelGainRate).toFixed(2) + "/s",
            "Next tick", fmt.time(nextTick-Date.now()),
            "Rep rate", fmt.large(repRate) + "/s",
        ],
        [
            "Respect rate", fmt.large(5 * stats.respectGainRate) + "/s",
            "Teritory", fmt.pct(stats.territory, 2),
            "Penalty", fmt.int(100 - stats.wantedPenalty * 100),
            "Clash chance", fmt.int(stats.territoryClashChance * 100),
            "Rep goal", repGoal ? fmt.large(repGoal) : "",
        ],
        [
            "Win chance", ...chances,
            "Focus: " + focus,
            "Rep ETA", repGoal ? fmt.time((repGoal-curRep)/repRate*1000) : "",
        ],
    ];
    var memberData = [];
    for (var m of ns.gang.getMemberNames()) {
        var i = ns.gang.getMemberInformation(m);
        memberData.push([
            m, i.task, i.str, i.def, i.dex, i.agi, i.cha, i.hack, i.earnedRespect,
            5 * i.moneyGain, (5 * i.respectGain).toFixed(3), (5 * i.wantedLevelGain).toFixed(3),
            i.upgrades.map(shorten), i.augmentations.map(shorten),
        ])
    }
    ns.clearLog();
    ns.print(fmt.table(gangData), "\n");
    ns.print(fmt.table(
        memberData,
        ["NAME", "TASK", "STR", "DEF", "DEX", "AGI", "CHA", "HACK", "EARNED RSPT", "$ GAIN", "REPT GAIN", "WANTED GAIN", "GEAR", "AUGS"],
        [null, null, null, null, null, null, null, null, fmt.int, fmt.money],
    ));

}
import * as fmt from "/lib/fmt.js";
import {getManualCrimeNames} from "/lib/constants.js";

/** @param {NS} ns **/
function checkGang(ns) {
    if (!ns.gang.inGang()) {
        if (ns.gang.createGang("Slum Snakes")) {
            ns.tprintf("Created gang");
        } else {
            ns.tprintf("Failed to create gang");
        }
        ns.exit();
        return false;
    }
    return true;
}

/** @param {NS} ns **/
export async function main(ns) {
    var cmd = ns.args.shift();
    if (cmd != "crimes" && !checkGang(ns)) { return }
    switch (cmd) {
        case "list":
            var info = ns.gang.getOtherGangInformation();
            var data = [];
            for (var [n,i] of Object.entries(info)) {
                var gText = [];
                for (var [k,v] of Object.entries(i)) {
                    gText.push(sprintf("%s: %s", k, v));
                }
                data.push([
                    n, ...gText,
                ])
            }
            ns.tprintf(fmt.table(data));
            break;
        case "info":
            ns.tprintf(fmt.object(ns.gang.getGangInformation()));
            break;
        case "asc":
            var data = [];
            for (var m of ns.gang.getMemberNames()) {
                var i = ns.gang.getAscensionResult(m);
                data.push([
                    m, i.respect, i.hack, i.str, i.def, i.dex, i.agi, i.cha
                ])
            }
            ns.tprintf(fmt.table(
                data,
                ["NAME", "RSPT", "HACK", "STR", "DEF", "DEX", "AGI", "CHA"],
                [null, fmt.large, fmt.gain, fmt.gain, fmt.gain, fmt.gain, fmt.gain, fmt.gain]
            ))
            break;
        case "members":
            var data = [];
            for (var m of ns.gang.getMemberNames()) {
                var i = ns.gang.getMemberInformation(m);
                data.push([
                    m, i.task, i.str, i.def, i.dex, i.agi, i.cha, i.hack, i.earnedRespect, i.moneyGain, i.respectGain, i.wantedLevelGain, i.upgrades, i.augmentations,
                ])
            }
            ns.tprintf(fmt.table(
                data,
                ["NAME", "TASK", "STR", "DEF", "DEX", "AGI", "CHA", "HACK", "EARNED RSPT", "$ GAIN", "REPT GAIN", "WANTED GAIN", "UPGRADES", "AUGS"],
                [null, null, null, null, null, null, null, null, fmt.int, fmt.money, fmt.int, fmt.int],
            ));
            break;
        case "member":
            var name = ns.args.shift();
            ns.tprintf(fmt.object(ns.gang.getMemberInformation(name)))
            break;
        case "crimes":
            var data = [];
            for (var c of getManualCrimeNames()) {
                var stats = ns.getCrimeStats(c);
                data.push([
                    stats.name, stats.difficulty.toFixed(2), stats.time,
                    stats.money, stats.karma, stats.kills,
                    stats.strength_exp, stats.defense_exp, stats.dexterity_exp,
                    stats.agility_exp, stats.charisma_exp, stats.intelligence_exp
                ])
            }
            ns.tprintf(fmt.table(
                data,
                ["NAME", "DIFF", "TIME", "$", "KARMA", "KILLS", "STR", "DEF", "DEX",
                 "AGI", "CHA", "INT"],
                [null, null, fmt.time, fmt.money],
            ))
            break;
        case "tasks":
            var stats = ns.gang.getTaskNames().map(t => ns.gang.getTaskStats(t));
            var data = [];
            for (var s of stats) {
                var tText = [];
                for (var [k,v] of Object.entries(s.territory)) {
                    tText.push(sprintf("%s: %s", k, fmt.gain(v)));
                }
                data.push([
                    s.name, s.baseMoney, s.baseRespect, s.baseWanted,
                    s.strWeight, s.defWeight, s.dexWeight, s.agiWeight, s.chaWeight, s.hackWeight,
                    s.difficulty, tText.join(", ")
                ]);
            }
            ns.tprintf(fmt.table(
                data,
                ["NAME", "$", "REPT", "WANTED", "STR", "DEF", "DEX", "AGI", "CHA", "HACK", "DIFF", "TERRITORY"]
            ));
            break;
        case "eq":
            var data = [];
            for (var e of ns.gang.getEquipmentNames()) {
                var stats = ns.gang.getEquipmentStats(e);
                var sText = [];
                for (var [k,v] of Object.entries(stats)) {
                    sText.push(sprintf("%s: %s", k, fmt.gain(v, {digits: 0, fmtstring: true})));
                }
                data.push([
                    e, fmt.money(ns.gang.getEquipmentCost(e)),
                    ns.gang.getEquipmentType(e), ...sText,
                ]);
            }
            ns.tprintf(fmt.table(data));
            break;
        default:
            ns.tprintf("Don't know what to do with %s", cmd);
    }
}
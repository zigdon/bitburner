import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    var cmd = ns.args.shift();
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
                    sText.push(sprintf("%s: %s", k, fmt.gain(v, 0, true)));
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
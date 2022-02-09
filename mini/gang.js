import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    var cmd = ns.args.shift();
    switch (cmd) {
        case "create":
            if (ns.gang.createGang("Slum Snakes")) {
                ns.tprintf("Created gang");
            } else {
                ns.tprintf("Failed to create gang");
            }
            break;
        case "info":
            ns.tprintf(fmt.object(ns.gang.getGangInformation()));
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
        default:
            ns.tprintf("Don't know what to do with %s", cmd);
    }
}
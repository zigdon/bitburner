import { getFactions, shortFact } from "/lib/constants.js";
import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    var flags = ns.flags([
        ["quiet", false],
    ])
    ns.disableLog("sleep");

    var mode = ns.args[0] || "list";
    var priority = ns.args[1] || "none";
    var owned = ns.getOwnedAugmentations(true);
    var donateThresh = ns.getFavorToDonate();
    var augs = [];
    var factions = [];
    for (var f of getFactions()) {
        var curRep = ns.getFactionRep(f)
        if (curRep > 0) {
            factions.push(f);
        }
        for (var a of ns.getAugmentationsFromFaction(f)) {
            await ns.sleep(1);
            var rep = ns.getAugmentationRepReq(a);
            augs.push({
                faction: f,
                name: a,
                owned: owned.indexOf(a) >= 0,
                price: ns.getAugmentationPrice(a),
                rep: rep,
                req: ns.getAugmentationPrereq(a),
                hackVal: ns.getAugmentationStats(a).hacking_mult || ns.getAugmentationStats(a).hacking_exp_mult || 0,
                hasRep: curRep > 0 && rep <= curRep,
            })
        }
    }

    var sorter = {
        byName: (a, b) => a.name > b.name ? 1 : -1,
        byPrice: (a, b) => a.price - b.price,
        byHack: (a, b) => a.hackVal - b.hackVal,
    };

    switch (mode) {
        case "list":
        case "buy":
        case "donate":
            // List only from factions we have rep with
            augs = augs.filter(a => factions.indexOf(a.faction) >= 0)

            switch (priority) {
                case "none":
                    augs.sort(sorter.byPrice);
                    break;
                case "hack":
                    augs.sort(sorter.byHack);
                    break;
            }
            break;
        case "all":
            // No filters
            augs.sort(sorter.byName);
            break;
        default:
            // Filter by name
            augs.sort(sorter.byName);
            augs = augs.filter(a => a.name.includes(mode));
    }

    var legend = new Map();
    var data = [];
    for (a of augs) {
        if (mode != "all" && a.owned) { continue }
        legend.set(shortFact(a.faction), a.faction);
        var stats = ns.getAugmentationStats(a.name);
        data.push([
            a.name, shortFact(a.faction), a.owned ? "✓" : "x", fmt.money(a.price), a.hasRep ? "✓" : fmt.large(a.rep), a.req,
            [
                stats.hacking_mult,
                stats.hacking_exp_mult,
            ].map(s => s ? fmt.gain(s, { fmtstring: true }) : "-"),
        ])
    }
    ns.tprintf(fmt.table(data,
        ["NAME", "FACTION", "OWNED", "COST", "REP", "PREREQ", "HACK"]),
    );
    data = [];
    for (var k of legend) {
        data.push([
            k[0], k[1], ns.getFactionRep(k[1]), ns.getFactionFavor(k[1]),
        ])
    }
    ns.tprintf("\n");
    ns.tprintf(fmt.table(data,
        ["ALIAS", "NAME", "REP", "FAVOR"],
        [null, null, fmt.large, fmt.large],
    ))
    ns.tprintf("\n");
    var cost = 0;
    var toBuy = [];
    var ownedNames = augs.filter(a => a.owned).map(a => a.name)
    var cantAfford = new Map();
    var mult = 1;
    var cont = true;
    var needRep = new Map();
    while (cont) {
        cont = false;
        for (var i = augs.length; i--; i >= 0) {
            var a = augs[i];
            if (toBuy.indexOf(a.name) >= 0 || ownedNames.indexOf(a.name) >= 0) {
                continue;
            }
            if (!a.req.every(r => ownedNames.indexOf(r) >= 0)) {
                continue;
            }
            if (ns.getServerMoneyAvailable("home") - cost < a.price * mult) {
                cantAfford.set(a.name, a);
                continue;
            }
            var rep = ns.getFactionRep(a.faction);
            if (rep < a.rep) {
                if (!needRep.has(a.faction)) {
                    needRep.set(a.faction, a.rep - rep);
                } else if (needRep.get(a.faction) < a.rep - rep) {
                    needRep.set(a.faction, a.rep - rep);
                }
                if (mode == "buy") {
                    continue;
                }
            }
            cantAfford.delete(a.name);
            cost += a.price * mult;
            ns.tprintf("-> %s: %s for %s", a.faction, a.name, fmt.money(a.price * mult));
            mult *= 2;
            toBuy.push([a.faction, a.name]);
            ownedNames.push(a.name);
            cont = true;
        }
    }
    ns.tprintf("Total cost: %s, (multiplier: %s)", fmt.money(cost), fmt.int(mult));
    if (mode == "unaffordable" && cantAfford.size > 0) {
        var missing = 0;
        ns.tprintf("Can't afford %d", cantAfford.size)
        cantAfford.forEach((a) => {
            ns.tprintf("  %s: %s", a.name, fmt.money(a.price));
            missing += a.price * mult;
            mult *= 2;
        });
        ns.tprintf("Would require an additional %s", fmt.money(missing));
    }
    if (needRep.size > 0) {
        var repMult = ns.getPlayer().faction_rep_mult;
        ns.tprintf("Missing rep:");
        var donated = [];
        for (var [f, r] of needRep) {
            if (ns.getFactionFavor(f) > donateThresh) {
                if (donated.indexOf(f) > -1) { continue }
                var amt = r * 1e6 / repMult;
                ns.tprintf("  %s: %s (%s)", f, fmt.large(r), fmt.money(amt));
                if (mode == "donate" && ns.getServerMoneyAvailable("home") >= amt &&
                    (flags.quiet || await ns.prompt(sprintf("Donate %s to %s?", fmt.money(amt), f)))) {
                    if (!ns.donateToFaction(f, amt)) {
                        ns.tprintf("Failed to donate!");
                    } else {
                        donated.push(f);
                    }
                }
            } else {
                ns.tprintf("  %s: %s", f, fmt.large(r));
            }
        }
    }

    if ((needRep.size == 0 && toBuy.length > 0 && cantAfford.length == 0 || mode == "buy") &&
        (flags.quiet || await ns.prompt(sprintf("Buy these %d augs for %s?", toBuy.length, fmt.money(cost))))) {
        while (toBuy.length > 0) {
            var a = toBuy.shift();
            if (ns.purchaseAugmentation(a[0], a[1])) {
                ns.tprintf("Bought %s from %s, %s remains.", a[1], a[0], fmt.money(ns.getServerMoneyAvailable("home")));
            } else {
                ns.tprintf("Failed to buy %s from %s.", a[1], a[0]);
                break;
            }
        }
    }
}
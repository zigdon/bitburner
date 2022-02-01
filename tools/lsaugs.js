import { getFactions, shortFact, longFact } from "/lib/constants.js";
import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {

    var mode = ns.args[0];
    var owned = ns.getOwnedAugmentations(true);
    var augs = [];
    var factions = [];
    var widest = 0;
    for (var f of getFactions()) {
        var curRep = ns.getFactionRep(f)
        if (curRep > 0) {
            factions.push(f);
        }
        for (var a of ns.getAugmentationsFromFaction(f)) {
            await ns.sleep(5);
            var has = owned.indexOf(a) >= 0;
            var price = ns.getAugmentationPrice(a);
            var rep = ns.getAugmentationRepReq(a);
            var req = ns.getAugmentationPrereq(a);
            if (a.length > widest) {
                widest = a.length;
            }
            augs.push({
                faction: f,
                name: a,
                owned: has,
                price: price,
                rep: rep,
                req: req,
                hasRep: curRep > 0 && rep <= curRep,
            })
        }
    }

    var printAug = function (a) {
        ns.tprintf("%" + widest + "s | %5s | %s | %8s | %8s | %s",
            a.name, shortFact(a.faction), a.owned ? "✓" : "x", fmt.money(a.price), a.hasRep ? "✓" : fmt.large(a.rep), a.req,
        );
    }

    if (mode != "all") {
        widest = 0;
        augs = augs.filter((a) => {
            if (factions.indexOf(a.faction) >= 0) {
                if (a.name.length > widest) {
                    widest = a.name.length;
                }
                return true;
            }
            return false;
        });
        augs = augs.sort((a, b) => { return a.price - b.price });
    }

    var legend = new Map();
    for (a of augs) {
        if (mode != "all" && a.owned) { continue }
        legend.set(shortFact(a.faction), a.faction);
        printAug(a);
    }
    for (var k of legend) {
        ns.tprintf("%s - %s", k[0], k[1]);
    }
    var cost = 0;
    var toBuy = [];
    var ownedNames = augs.filter(a => a.owned).map(a => a.name)
    var cantAfford = new Map();
    var mult = 1;
    var cont = true;
    var needRep = new Map();
    while (cont) {
        cont = false;
        for (var i=augs.length-1; i--; i>=0) {
            var a = augs[i];
            if (toBuy.indexOf(a.name) >= 0 || ownedNames.indexOf(a.name) >= 0) {
                continue;
            }
            if (!a.req.every(r => ownedNames.indexOf(r) >= 0)) {
                continue;
            }
            if (ns.getServerMoneyAvailable("home") - cost < a.price*mult) {
                cantAfford.set(a.name, a);
                continue;
            }
            cantAfford.delete(a.name);
            cost += a.price*mult;
            ns.tprintf("-> %s: %s for %s", a.faction, a.name, fmt.money(a.price*mult));
            mult *= 2;
            toBuy.push([a.faction, a.name]);
            ownedNames.push(a.name);
            cont = true;
            var rep = ns.getFactionRep(a.faction);
            if (rep < a.rep) {
                if (!needRep.has(a.faction)) {
                    needRep.set(a.faction, a.rep-rep);
                } else {
                    needRep.set(a.faction, needRep.get(a.faction) + a.rep-rep);
                }
            }
        }
    }
    ns.tprintf("Total cost: %s, (multiplier: %s)", fmt.money(cost), fmt.int(mult));
    ns.tprintf("Can't afford %d", cantAfford.size)
    var missing = 0;
    cantAfford.forEach((a) => {
        ns.tprintf("  %s: %s", a.name, fmt.money(a.price));
        missing += a.price * mult;
        mult *= 2;
    });
    ns.tprintf("Would require an additional %s", fmt.money(missing));
    if (needRep.size > 0) {
        var repMult = ns.getPlayer().faction_rep_mult;
        ns.tprintf("Missing rep:");
        for (var [f, r] of needRep) {
            ns.tprintf("  %s: %s (%s)", f, fmt.large(r), fmt.money(r*1e6/repMult));
        }
    }

    if (needRep.size == 0 && toBuy.length > 0 &&
        await ns.prompt(ns.sprintf("Buy these %d augs for %s?", toBuy.length, fmt.money(cost)))) {
        while (toBuy.length > 0 ) {
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
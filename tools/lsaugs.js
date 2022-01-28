import { getFactions, shortFact, longFact } from "/lib/constants.js";
import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {

    var mode = ns.args[0];
    var owned = ns.getOwnedAugmentations(true);
    var augs = [];
    var factions = [];
    var acronyms = new Map();
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
        ns.tprintf("%" + widest + "s | %5s | %5s | %7s | %13s | %s",
            a.name, shortFact(a.faction), a.owned, fmt.money(a.price), a.hasRep ? "✓" : fmt.int(a.rep), a.req,
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
        legend.set(shortFact(a.faction), a.faction);
        printAug(a);
    }
    for (var k of legend) {
        ns.tprintf("%s - %s", k[0], k[1]);
    }
    var cost = 0;
    var toBuy = [];
    var owned = augs.filter((a) => {return a.owned}).map((a) => {return a.name})
    var cantAfford = new Map();
    var mult = 1;
    var cont = true;
    while (cont) {
        cont = false;
        for (var i=augs.length-1; i--; i>=0) {
            var a = augs[i];
            if (toBuy.indexOf(a.name) >= 0) {
                continue;
            }
            var rep = ns.getFactionRep(a.faction);
            if (rep < a.rep) {
                continue;
            }
            if (a.req != "" && owned.indexOf(a.req) == -1) {
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
            owned.push(a.name);
            cont = true;
        }
    }
    ns.tprintf("Total cost: %s, (multiplier: %d)", fmt.money(cost), fmt.int(mult));
    if (cantAfford.size > 0) {
        ns.tprintf("Can't afford %d", cantAfford.size)
        cantAfford.forEach((a) => {
            ns.tprintf("  %s: %s", a.name, fmt.money(a.price));
        });
    }

    if (toBuy.length > 0 && await ns.prompt(ns.sprintf("Buy these %d augs for %s?", toBuy.length, fmt.money(cost)))) {
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
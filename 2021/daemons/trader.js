import {getAllStocks} from "/lib/stock.js";
import {netLog, console} from "/lib/log.js";
import * as fmt from "/lib/fmt.js";

var positions = new Map();
var stats = new Map();

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    await netLog(ns, "trader starting up...");
    updatePositions(ns);
    stats.set("startTime", Date.now());
    stats.set("startPos", []);
    stats.set("profit", 0);
    for (let [_, sym] of positions) {
        var p = sym["position"];
        stats.get("startPos").push({
            sym: sym.sym,
            long: p[0],
            longAvg: p[1],
            short: p[2],
            shortAvg: p[3],
        });
    }

    while(true) {
        await doTrade(ns);

        await ns.sleep(5000);
    }
}

/** @param {NS} ns **/
async function doTrade(ns) {
    var tx = [];
    // Buy when the forecast > 62%, sell when it's < 60%
    getAllStocks(ns).forEach((s) => {
        // var max = ns.stock.getMaxShares(s.sym);
        var max = 10;
        if (s.position[0] > 0 && s.forecast < 60) {
            ns.print("max = ", max);
            tx.push({
                tx: "sell",
                sym: s.sym,
                shares: s.position[0],
                profit: ns.stock.getSaleGain(s.sym, s.position[0], "Long"),
            });
        } else if (s.forecast > 62 && s.position[0] < max) {
            var n = max - s.position[0];
            tx.push({
                tx: "buy",
                sym: s.sym,
                shares: n,
                profit: -ns.stock.getPurchaseCost(s.sym, n, "Long"),
            });
        }
    })

    var profit = 0;
    for (let t of tx) {
        profit += t.profit;
        if (t.tx == "buy") {
            var price = ns.stock.buy(t.sym, t.shares);
            if (price) {
                await console(ns, "Bought %d shares of %s at $%s.", t.shares, t.sym, fmt.int(price));
            } else {
                ns.tprintf("Couldn't buy %d shares of %s.", t.shares, t.sym);
            }
        } else {
            var price = ns.stock.sell(t.sym, t.shares);
            if (price) {
                await console(ns, "Sold %d shares of %s at $%s.", t.shares, t.sym, fmt.int(price));
            } else {
                ns.tprintf("Couldn't sell %d shares of %s.", t.shares, t.sym);
            }
        }
    }
    if (profit != 0) {
        stats.set("profit", stats.get("profit")+profit);
        console(ns, "Tx delta: $%s, total: $%s", fmt.int(profit), fmt.int(stats.get("profit")));
    }
    updatePositions(ns);
}

function holds(s) {
    return s.position.filter((p) => { return p>0 }).length != 0
}

/** @param {NS} ns **/
function updatePositions(ns) {
    var seen = new Map();
    getAllStocks(ns).forEach((s) => {
        if (!holds(s)) {
            return;
        }
        seen.set(s.sym, true);
        positions.set(s.sym, s);
    });

    for (let s of positions) {
        if (seen.has(s)) {
            continue;
        }
        positions.delete(s);
    }
}
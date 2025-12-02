import * as cp from "/lib/contracts.js";

/** @param {NS} ns **/
export async function main(ns) {
    let data;
    let tx;
    if (ns.args[0].startsWith("[")) {
        [tx, data] = eval(ns.args[0]);
    } else {
        var host = ns.args[0];
        var file = ns.args[1];
        var lvl = ns.args[2];
        tx = 1;
        var name = "Algorithmic Stock Trader";
        switch (lvl) {
            case 1:
                name += " I";
                break;
            case 2:
                name += " II";
                tx = 99;
                break;
            default:
                ns.tprintf("Not implemented.");
                return;
        }
        data = await cp.proxyReqData(ns, host, file, name);
        if (!data) {
            ns.tail();
            ns.tprint("Couldn't get data from proxy!");
            return;
        }
    }
    ns.tprint(typeof(data));
    ns.tprint(data);

    var trades = getTrades(ns, data);
    var picks = await pickTrades(ns, trades, tx);
    ns.tprintf("Selected trades:");
    picks.forEach((t) => (ns.tprintf("{buy: %d, sell: %d}", t.buy, t.sell)));
    var profit = 0;
    picks.forEach((p) => { profit += p.sell - p.buy })
    ns.tprintf("profit: %d", profit);

    ns.tprint(await cp.proxyPostAnswer(ns, host, file, profit));
}

/**
 * @param {NS} ns
 * @param {Object[]} trades
 * @param {int} trades.buy
 * @param {int} trades.sell
 * @param {int} tx
 */
export async function pickTrades(ns, trades, tx) {
    if (tx >= trades.length) {
        return trades;
    }

    var trade;
    var bestProfit = 0;
    var bestNext;
    for (var b=0; b <= trades.length-tx; b++) {
        for (var s=b; s <= trades.length-tx; s++) {
            var profit = 0;
            var next = [];
            if (tx > 1) {
                next = await pickTrades(ns, trades.slice(s+1), tx-1);
                next.forEach((t) => { profit += t.sell - t.buy })
            }
            
            if (trades[s].sell - trades[b].buy + profit > bestProfit) {
                trade = {buy: trades[b].buy, sell: trades[s].sell};
                bestProfit = trades[s].sell - trades[b].buy + profit;
                bestNext = next;
            }
        }
    }

    bestNext.unshift(trade);
    return bestNext;
}

export function getTrades(ns, data) {
    // find transactions, buy at a local min, sell at a following local max
    var trades = [];
    var val = data[0];
    var yesterday = 0;
    for (var i = 0; i < data.length; i++) {
      var today = data[i];
      if (today < yesterday && val != 0) {
          trades.push({buy: val, sell: yesterday});
          val = 0;
      } else if (today > yesterday && val == 0) {
          val = yesterday;
      }
      yesterday = today;
    }
    if (val > 0) {
        trades.push({buy: val, sell: yesterday});
    }

    return trades;
}
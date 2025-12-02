import * as fmt from "/lib/fmt.js";
import {getAllStocks} from "/lib/stock.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.tprintf("%6s: %9s %9s %5s %10s %8s %s", "sym", "ask", "bid", "forcast", "max", "price", "vol");
    getAllStocks(ns).forEach((s) => {
        printStock(ns, s);
    })
    // var orders = ns.stock.getOrders()
    // ns.tprintf("orders: %s", orders);
}

/**
 * @param {NS} ns
 * @param {Object} sym
 */
function printStock(ns, sym) {
    ns.tprintf("%6s: %9.2f %9.2f %6d%% %10s %8.2f %.2f%%",
        sym.sym, sym.ask, sym.bid, sym.forecast, fmt.int(sym.max), sym.price, sym.volatility);
    if (sym.position.filter((p) => { return p > 0 }).length > 0) {
        const p = sym.position;
        ns.tprintf("%6s>  Shares: %s (avg: $%s)  Short: %s (avg: $%s)",
          "", fmt.int(p[0]), fmt.int(p[1]), fmt.int(p[2]), fmt.int(p[3]));
    }
}
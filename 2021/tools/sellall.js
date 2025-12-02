import * as fmt from "/lib/fmt.js";
import {getOwnedStocks} from "/lib/stock.js";
/** @param {NS} ns **/
export async function main(ns) {
    var owned = getOwnedStocks(ns);
    owned.forEach((s) => {
        var qty = s.position[0];
        var price = ns.stock.sell(s.sym, qty);
        if (price) {
            ns.tprintf("Sold %s shares of %s at $%s for $%s",
                fmt.int(qty), s.sym, fmt.int(price), fmt.int(price*qty));
        } else {
            ns.tprintf("Failed to sell %s shares of %s", fmt.int(qty), s.sym);
        }
    });
}
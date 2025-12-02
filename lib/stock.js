/** @param {NS} ns **/

/**
 * @param {NS} ns
 * @param {string} sym
 * @return {object}
 */
export function getStockData(ns, sym) {
    var ask = ns.stock.getAskPrice(sym);
    var bid = ns.stock.getBidPrice(sym);
    var forecast = ns.stock.getForecast(sym);
    var max = ns.stock.getMaxShares(sym);
    var pos = ns.stock.getPosition(sym);
    var price = ns.stock.getPrice(sym);
    var vol = ns.stock.getVolatility(sym);
    return {
        sym: sym,
        ask: ask,
        bid: bid,
        forecast: forecast * 100,
        max: max,
        price: price,
        volatility: vol * 100,
        position: pos,
        holds: pos.filter((p) => { return p > 0 }).length > 0,
    }
}

/**
 * @param {NS} ns
 * @return {Map<string, Object>}
 **/
export function getAllStocks(ns) {
    var syms = ns.stock.getSymbols();
    var res = new Map();
    syms.forEach((s) => {
        var d = getStockData(ns, s);
        res.set(d.sym, d);
    })

    return res;
}

/**
 * @param {NS} ns
 * @returns {Object[]}
 */
export function getOwnedStocks(ns) {
    var res = [];
    getAllStocks(ns).forEach((s) => { if (s.holds) { res.push(s) } })
    return res;
}
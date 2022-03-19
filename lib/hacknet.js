import * as fmt from "/lib/fmt.js";

export const spend = {
    MONEY: "Sell for Money",
    CORPMONEY: "Sell for Corporation Funds",
    MINSEC: "Reduce Minimum Security",
    MAXVAL: "Increase Maximum Money",
    STUDY: "Improve Studying",
    GYM: "Improve Gym Training",
    CORPRES: "Exchange for Corporation Research",
    BBRANK: "Exchange for Bladeburner Rank",
    BBSP: "Exchange for Bladeburner SP",
    CONTRACT: "Generate Coding Contract",
}

/** @param {NS} ns */
export function printInfo(ns) {
    let res = [];
    let rate = 0;
    let data = [];
    for (let n=0; n<ns.hacknet.numNodes(); n++) {
        let info = ns.hacknet.getNodeStats(n);
        rate += info.production;
        data.push([
            info.name, info.ram, info.ramUsed/info.ram, info.level, info.cores, info.cache,
            info.production, info.totalProduction, info.hashCapacity, info.timeOnline*1000,
        ])
    }
    res.push(ns.sprintf("Servers: %s/%s;  Hashes: %s/%s (%s/s);  ETA: %s",
        ns.hacknet.numNodes(), ns.hacknet.maxNumNodes,
        fmt.large(ns.hacknet.numHashes()), fmt.large(ns.hacknet.hashCapacity()),
        fmt.large(rate, {digits: 3}),
        fmt.time((ns.hacknet.hashCapacity()-ns.hacknet.numHashes())/rate*1000),
    ));
    res.push(ns.sprintf(fmt.table(data, [
        "name", ["ram", fmt.memory], ["%% used", n=>fmt.pct(n, {fmtstring: true})],
        "level", "cores", "cache", ["production", n=>fmt.large(n, {digits:3})], ["total", fmt.large],
        ["capacity", fmt.large], ["online", fmt.time],
    ])));

    return res.join("\n");
}

/** @param {NS} ns */
export function getRate(ns) {
    let rate = 0;
    for (let n=0; n<ns.hacknet.numNodes(); n++) {
        let info = ns.hacknet.getNodeStats(n);
        rate += info.production;
    }

    return rate;
}
import { log, console } from "/lib/log.js";
import { getHost, hosts } from "/lib/hosts.js";
import { getTrades, pickTrades } from "/contracts/trader.js";
import { mkIPs } from "/contracts/ips.js";
import { makeValid } from "/contracts/parens.js";
import { paths } from "/contracts/paths.js";
import { blockedPaths } from "/contracts/paths2.js";
import { getSum } from "/contracts/sum.js";
import { subsum } from "/contracts/subsub.js";
import { spiral } from "/contracts/spiral.js";
import { factor } from "/contracts/factor.js";
import { solveIntervals } from "/contracts/intervals.js";
import { jump } from "/contracts/jump.js";
import { trianglePath } from "/contracts/triangle.js";

/** @param {NS} ns **/
export async function main(ns) {
    var host = ns.args[0];
    var file = ns.args[1];

    var hs = [];
    if (host) {
        if (file) {
            await handleContract(ns, file, host);
            return;
        } else {
            hs.push(getHost(ns, host));
        }
    } else {
        hs = hosts(ns);
    }

    for (var i in hs) {
        var h = hs[i].host;
        var files = ns.ls(h, ".cct");
        for (var f in files) {
            await handleContract(ns, files[f], h);
        }
    }
}

/**
 * @param {NS} ns
 * @param {string} file
 * @param {string} host
 */
export async function handleContract(ns, file, host) {
    var cType = ns.codingcontract.getContractType(file, host);
    var cDesc = ns.codingcontract.getDescription(file, host);
    var cData = ns.codingcontract.getData(file, host);
    await log(ns, "Examining %s on %s: %s", file, host, cType);

    var level = 0;
    var res;
    switch (cType) {
        case "Algorithmic Stock Trader I":
        case "Algorithmic Stock Trader II":
        case "Algorithmic Stock Trader III":
        case "Algorithmic Stock Trader IV":
            var tx = [undefined, 1, 999, 2];
            switch(cType.split(" ")[3]) {
                case "I":
                    level = 1;
                    break;
                case "II":
                    level = 2;
                    break;
                case "III":
                    level = 3;
                    break;
                case "IV":
                    level = 4;
                    tx[4] = cData[0];
                    cData = cData[1];
                    break;
            }

            var trades = getTrades(ns, cData);
            var picks = await pickTrades(ns, trades, tx[level]);
            var answer = 0;
            for (var p in picks) {
                answer += picks[p].sell - picks[p].buy;
                await log(ns, "buy: %d, sell: %d", picks[p].buy, picks[p].sell);
            }
            res = ns.codingcontract.attempt(answer, file, host, { returnReward: true })
            break;
        case "Unique Paths in a Grid I":
            var answer = paths(cData);
            res = ns.codingcontract.attempt(answer, file, host, { returnReward: true })
            break;
        case "Unique Paths in a Grid II":
            var answer = blockedPaths(ns, cData);
            res = ns.codingcontract.attempt(answer, file, host, { returnReward: true })
            break;
        case "Sanitize Parentheses in Expression":
            var answer = makeValid(cData)
            res = ns.codingcontract.attempt(answer, file, host, { returnReward: true })
            break;
        case "Generate IP Addresses":
            var answer = mkIPs(ns, cData, 4);
            res = ns.codingcontract.attempt(answer, file, host, { returnReward: true })
            break;
        case "Total Ways to Sum":
            var answer = getSum(cData)-1;
            res = ns.codingcontract.attempt(answer, file, host, { returnReward: true })
            break;
        case "Subarray with Maximum Sum":
            var answer = subsum(cData).sum;
            res = ns.codingcontract.attempt(answer, file, host, { returnReward: true })
            break;
        case "Minimum Path Sum in a Triangle":
            var answer = trianglePath(cData);
            res = ns.codingcontract.attempt(answer, file, host, { returnReward: true })
            break;
        case "Spiralize Matrix":
            var answer = spiral(cData);
            res = ns.codingcontract.attempt(answer, file, host, { returnReward: true })
            break;
        case "Find Largest Prime Factor":
            var answer = await factor(ns, cData);
            res = ns.codingcontract.attempt(answer, file, host, { returnReward: true })
            break;
        case "Merge Overlapping Intervals":
            var answer = solveIntervals(cData);
            res = ns.codingcontract.attempt(answer, file, host, { returnReward: true })
            break;
        case "Array Jumping Game":
            var answer = jump(cData);
            res = ns.codingcontract.attempt(answer ? 1 : 0, file, host, { returnReward: true })
            break;

        default:
            await console(ns, "========\nDon't know how to handle %s on %s:", file, host);
            await console(ns, cType);
            await console(ns, cDesc);
    }
    if (res) {
        await console(ns, "%s: %s", cType, res);
    } else {
        await console(ns, "*** Failed contract %s on n%s", file, host);
    }

}
import * as cp from "/lib/contracts.js";

/** @param {NS} ns **/
export async function main(ns) {
    var host = ns.args[0];
    var file = ns.args[1];
    var data = await cp.proxyReqData(ns, host, file, "Array Jumping Game");
    if (!data) {
        ns.tail();
        ns.tprint("Couldn't get data from proxy!");
        ns.exit();
    }
    // 7,0,8,7,4,0,2,6,7,8,3
    ns.tprint(typeof(data));
    ns.tprint(data);
    var res = jump(data);
    ns.tprint(await cp.proxyPostAnswer(ns, host, file, res));
}

/**
 * @param {int[]} data
 */
export function jump(data) {
    if (data[0] == 0) {
        return false;
    }
    for (var i=1; i <= data[0]; i++) {
        if (i == data.length-1) {
            return true;
        }
        var sub = jump(data.slice(i));
        if (sub) {
            return true;
        }
    }

    return false;
}
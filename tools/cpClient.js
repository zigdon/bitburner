import {console} from "/lib/log.js";
import * as fmt from "/lib/fmt.js";
import * as cp from "/lib/contracts.js";

/** @param {NS} ns **/
export async function main(ns) {
    var host = ns.args[0];
    var res = await cp.proxyReqList(ns, host);
    ns.tprint(res);
    if (res) {
        console(ns, fmt.table(res));
    } else {
        console(ns, "Timeout waiting for proxy.");
    }
}
import {netLog, toast} from "/lib/log.js";
import {getPorts} from "/lib/ports.js";
/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    var ports = getPorts();
    await netLog(ns, "contract proxy starting");
    while(true) {
        await ns.sleep(500);
        var head = ns.peek(ports.CPROXY);
        if (head.startsWith("NULL")) {
            continue;
        }
        var now = Date.now();
        if (head.startsWith("> ")) {
            if (now - head.split(" ")[1] > 5000) {
                await netLog(ns, "expiring msg: %s", head);
                ns.readPort(ports.CPROXY);
                continue
            }
            continue
        }

        var words = ns.readPort(ports.CPROXY).split(" ");
        await netLog(ns, words.join(" "));
        // 0 1   2    3     4   5      4      5
        // < pid host {file | -} {get type | answer data | list}
        switch (words[4]) {
            case "get":
                var got = ns.codingcontract.getContractType(words[3], words[2]);
                var want = words.splice(5).join(" ");
                if (got != want) {
                    console(ns, "Bad contract type %s@%s: want %s, got %s", words[3], words[2], want, got);
                    continue;
                }
                await post(ns, words[1], JSON.stringify(ns.codingcontract.getData(words[3], words[2])));
            break;
            case "answer":
                await post(ns, words[1], ns.codingcontract.attempt(JSON.parse(words[5]), words[3], words[2], { returnReward: true }));
            break;
            case "list":
                var files = ns.ls(words[2], ".cct");
                var res = [];
                for (var f of files) {
                    res.push([f, ns.codingcontract.getContractType(f, words[2])]);
                }
                await post(ns, words[1], JSON.stringify(res));
            break;
            default:
                await toast(ns, "Unknown command to contractProxy: %s", words[4], {level: "error", timeout: 0});
        }

    }
}

/**
 * @param {NS} ns
 * @param {number} pid
 * @param {any} data
 */
async function post(ns, pid, data) {
    var now = Date.now();
    var ports = getPorts();
    // > timestamp pid data
    var msg = ns.sprintf("> %d %d %s", now, pid, data);
    await netLog(ns, msg);
    await ns.writePort(ports.CPROXY, msg);
}
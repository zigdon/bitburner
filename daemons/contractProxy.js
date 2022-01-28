import {netLog} from "/lib/log.js";
/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    await netLog(ns, "contract proxy starting");
    while(true) {
        await ns.sleep(500);
        var head = ns.peek(9);
        if (head.startsWith("NULL")) {
            continue;
        }
        var now = Date.now();
        if (head.startsWith("> ")) {
            if (now - head.split(" ")[1] > 5) {
                await netLog(ns, "expiring msg: %s", head);
                ns.readPort(9);
                continue
            }
            continue
        }

        var words = ns.readPort(9).split(" ");
        await netLog(ns, words.join(" "));
        // 0 1   2    3     4   5      4      5
        // < pid host file {get type | answer data}
        if (words[4] == "get") {
            var got = ns.codingcontract.getContractType(words[3], words[2]);
            var want = words.splice(5).join(" ");
            if (got != want) {
                console(ns, "Bad contract type %s@%s: want %s, got %s", words[3], words[2], want, got);
                continue;
            }
            await post(ns, words[1], JSON.stringify(ns.codingcontract.getData(words[3], words[2])));
            continue;
        }

        await post(ns, words[1], ns.codingcontract.attempt(JSON.parse(words[5]), words[3], words[2], { returnReward: true }));
    }
}

/**
 * @param {NS} ns
 * @param {number} pid
 * @param {any} data
 */
async function post(ns, pid, data) {
    var now = Date.now();
    // > timestamp pid data
    var msg = ns.sprintf("> %d %d %s", now, pid, data);
    await netLog(ns, msg);
    await ns.writePort(9, msg);
}
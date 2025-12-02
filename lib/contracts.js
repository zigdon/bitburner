import {getPorts} from "/lib/ports.js";
import {netLog} from "/lib/log.js";

/**
 * @param {NS} ns
 * @param {string} msg
 * 
 **/
async function send(ns, msg) {
    var port = getPorts().CPROXY;
    var pid = ns.getRunningScript().pid;
    msg = ns.sprintf("< %d %s", pid, msg);
    await netLog(ns, "Sending request: %s", msg);
    while (!await ns.tryWritePort(port, msg)) {
        await netLog(ns, "Waiting to send to contract proxy");
        await ns.sleep(100);
    }
    await netLog(ns, "Waiting for contract proxy reply");
    var start = Date.now();
    while (Date.now() - start < 10000) {
        // > timestamp pid data
        var head = ns.peek(port);
        var words = head.split(" ");
        if (words[0] != ">" || words[2] != pid) {
            await ns.sleep(100);
            continue;
        }
        head = ns.readPort(port);
        await netLog(ns, "got: %s", head);
        return JSON.parse(words.splice(3).join(" "));
    }

    await netLog(ns, "Timeout waiting for contract proxy");
    return;
}

/**
 * @param {NS} ns
 * @param {string} host
 * 
 **/
export async function proxyReqList(ns, host) {
    var msg = ns.sprintf("%s - list", host);
    return await send(ns, msg);
}

/**
 * @param {NS} ns
 * @param {string} host
 * @param {string} file
 * @param {string} type
 * 
 **/
export async function proxyReqData(ns, host, file, type) {
    var msg = ns.sprintf("%s %s get %s", host, file, type);
    return await send(ns, msg);
}

/**
 * @param {NS} ns
 * @param {string} host
 * @param {string} file
 * @param {any} answer
 * 
 **/
export async function proxyPostAnswer(ns, host, file, answer) {
    var msg = ns.sprintf("%s %s answer %s", host, file, answer);
    return await send(ns, msg);
}
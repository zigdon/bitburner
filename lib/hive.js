import {ports} from "/lib/ports.js";
import {toast, netLog} from "/lib/log.js";
import * as fmt from "/lib/fmt.js";

let lastTS = 0;
function debug(name) {
    let now = Date.now();
    console.log(`${name}: ${now} (${now-lastTS})`);
    lastTS = now;
}

/**
 * @param {NS} ns
 * @param {object} data
 * @param {bool} wait
 * @returns {void | bool | object}
 **/
export async function send(ns, data, wait=true) {
    let backoff = 1;
    let pid = ns.getRunningScript().pid;
    let hostname = ns.getRunningScript().server;
    while (!await ns.tryWritePort(ports.QUEEN, `${pid}@${hostname} ${JSON.stringify(data)}`)) {
        await netLog(ns, "Queen busy, waiting %s", fmt.time(backoff));
        await ns.sleep(backoff);
        backoff *= 2;
        if (backoff > 5000) {
            backoff = 5000;
        }
    }

    if (!wait) { return }

    backoff = 1;
    let start = Date.now();
    while (Date.now() - start < 60000) {
        let head = ns.peek(ports.BEES);
        if (head.startsWith("NULL") || !head.startsWith(`${pid}@${hostname}: `)) {
            await ns.sleep(backoff);
            backoff *= 2;
            if (backoff > 5000) {
                await netLog(ns, "%d@%s waiting for reply...", pid, hostname);
                backoff = 5000;
            }
            continue;
        }

        let blob = ns.readPort(ports.BEES).split(" ").splice(1);
        return JSON.parse(blob);
    }

    await toast(ns, "Timeout waiting for queen reply!", {level: "warning"});
    return false;
}

/**
 * @typedef {object} bee
 * @property {string} host
 * @property {string} type
 * @property {number} maxRam
 * @property {number} freeRam
 * @property {number} cores
 * 
 * @param {NS} ns
 * @returns {bee[]}
 */
export async function info(ns) {
    return await send(ns, ["query"]);
}

/**
 * @param {NS} ns
 */
export async function list(ns) {
    return await send(ns, ["list"]);
}

/**
 * @param {NS} ns
 * @param {number} id
 */
export async function checkStatus(ns, id) {
    let status = await send(ns, ["status", id]);
    if (status[1] === undefined) {
        return null;
    }
    ns.printf("Job complete: %s", !status[0]);
    for (let h of status[1]) {
        ns.printf("  %s: %s", h[0], h[1]? "Running": "Complete");
    }
    return status;
}

/**
 * @param {NS} ns
 * @param {string} cmd
 * @param {string} target
 * @param {number} delta
 */
export async function swarmSingle(ns, cmd, target, delta) {
    let [ok, job] = await send(ns, [cmd, target, delta]);
    if (!ok) { return null }
    ns.print(`Sent ${cmd} to the hive, jobID: ${job.id}. Threads launched:`);
    for (let t of job.tasks) {
        ns.print(`  ${t.host}: ${t.threads}`);
    }
    let timef = cmd == "weaken" ? ns.getWeakenTime : ns.getGrowTime;
    ns.print(`ETA: ${fmt.time(timef(target))}`);
    return job;
}

/**
 * @param {NS} ns
 * @param {string} fname
 * @returns {boolean | string}
 */
export async function batch(ns, fname) {
    if (!ns.fileExists(fname, "home")) {
        ns.print(`${fname} not found!`);
        return false;
    }
    let [ok, res] = await send(ns, ["json", fname]);
    if (ok) {
        ns.print(`Batch created: ${res}`);
        return res;
    } else {
        ns.print(`Failed to create batch: ${res}`);
        return false;
    }

}

/**
 * @param {NS} ns
 * @param {string} cmd
 * @param {string} target
 * @param {string} batchID
 * @param {number} startTS
 */
export async function schedule(ns, cmd, target, batchID, startTS) {
    let [ok, job] = await send(ns, ["schedule", cmd, target, batchID, startTS]);
    if (!ok) { return null }
    ns.print(`Sent ${cmd} to the hive, jobID: ${job.id}, batchID: ${job.batchID}.`);
    return job;
}
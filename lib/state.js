import { netLog } from "/lib/log.js";
import * as fmt from "/lib/fmt.js";

const state = "/conf/state.txt";
const fmts = {
    limit: [fmt.parseNum, fmt.money],
    reserve: [fmt.parseNum, fmt.money],
}

/**
 * @param {NS} ns
 * @param {string} tag
 **/
export function settings(ns, tag = "") {
    return {
        tag: tag,
        getFmt(name) {
            if (fmts[name] && fmts[name][1]) {
                return fmts[name][1](getNS(ns, tag, name));
            } else {
                return getNS(ns, tag, name);
            }
        },
        get: name => getNS(ns, tag, name),
        read: name => getNS(ns, tag, name),
        async set(name, value) {
            let data = readData(ns);
            if (fmts[name] && fmts[name][0]) {
                value = fmts[name][0](value);
            }
            await netLog(ns, `${ns.getScriptName()} set '${name}' to '${value}'`);
            data[name] = value;
            await saveData(ns, data);
        },
        async clear(name) {
            let data = readData(ns);
            delete data[name];
            await saveData(ns, data);
        },
        raw() { return readData(ns); },
    };
}

/**
 * @param {NS} ns
 * @param {string} tag
 * @param {string} name
 */
function getNS(ns, tag, name) {
    let data = readData(ns);
    if (data[`${tag}.${name}`] !== undefined) {
        return data[`${tag}.${name}`];
    } else if (data[name] !== undefined) {
        return data[name];
    }
    return undefined;
}

/** @param {NS} ns */
function readData(ns) {
    let blob = {};
    if (ns.fileExists(state, "home")) {
        blob = JSON.parse(ns.read(state));
    }
    return blob;
}

/**
* @param {NS} ns
* @param {object} data
**/
async function saveData(ns, data) {
    await ns.write(state, JSON.stringify(data), "w");
}
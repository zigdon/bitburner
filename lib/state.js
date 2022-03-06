import { netLog } from "/lib/log.js";
import * as fmt from "/lib/fmt.js";

const state = "/conf/state.txt";
const defaults = {};
const fmts = {
    limit: fmt.parseNum,
    reserve: fmt.parseNum,
}

/**
 * @param {NS} ns
 * @param {string} tag
 **/
export function settings(ns, tag = "") {
    return {
        tag: tag,
        get(name) {
            let data = readData(ns);
            if (data[`${tag}.${name}`] !== undefined) {
                return data[`${tag}.${name}`];
            } else {
                return data[name] === undefined ? defaults[name] : data[name];
            }
        },
        async set(name, value) {
            let data = readData(ns);
            if (fmts[name]) {
                value = fmts[name](value);
            }
            await netLog(ns, `${ns.getScriptName()} set '${name}' to '${value}'`);
            data[name] = value;
            await saveData(ns, data);
        }
    };
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
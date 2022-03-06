import {settings} from "/lib/state.js";

/** @param {NS} ns **/
export async function main(ns) {
    let s = settings(ns);
    let cmd = ns.args.shift();
    let key = ns.args.shift();
    switch (cmd) {
        case "get":
            ns.tprintf("%s: '%s'", key, s.get(key));
            break;
        case "set":
            let old = s.get(key);
            let val = ns.args.shift();
            await s.set(key, val);
            if (old == s.get(key)) {
                ns.tprintf("%s: unmodified: '%s'", key, old);
            } else {
                ns.tprintf("%s: '%s' -> '%s'", key, old, s.get(key));
            }
            break;
        default:
            ns.tprintf("Unknown command %s, should be 'get' or 'set'");
    }
}
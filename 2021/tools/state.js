import {settings} from "/lib/state.js";

/** @param {NS} ns **/
export async function main(ns) {
    let flags = ns.flags([
        [ "create", false ],
    ])
    let s = settings(ns);
    let cmd = ns.args.shift();
    let key = ns.args.shift();
    switch (cmd) {
        case "list":
            for (let k of Object.keys(s.raw()).sort((a,b) => a[0] < b[0] ? -1 : 1)) {
                ns.tprintf("  %s: '%s'", k, s.getFmt(k));
            }
            break;
        case "get":
            ns.tprintf("%s: '%s'", key, s.getFmt(key));
            break;
        case "set":
            let old = s.getFmt(key);
            if (old === undefined && !flags.create) {
                ns.tprintf("Unknown key: %s", key);
                return;
            }
            let val = ns.args.shift();
            switch (val) {
                case "null":
                    val = null;
                    break;
                case "undefined":
                    val = undefined;
                    break;
            }
            await s.set(key, val);
            if (old == s.getFmt(key)) {
                ns.tprintf("%s: unmodified: '%s'", key, old);
            } else {
                ns.tprintf("%s: '%s' -> '%s'", key, old, s.getFmt(key));
            }
            break;
        case "clear":
            await s.clear(key);
            ns.tprintf("Cleared value for '%s'", key);
            break;
        default:
            ns.tprintf("Unknown command %s, should be 'get', 'set', or 'list'");
    }
}
import {netLog} from "/lib/log.js";
import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    while (true) {
        let logs = ns.ls("home", "/log/");
        for (let log of logs) {
            if (log.includes("/keep/")) { continue }
            let data = ns.read(log);
            if (data.length > 50000) {
                if (log.includes("/home/")) { 
                    await netLog(ns, "Not removing %s, with %s bytes", log, fmt.large(data.length));
                } else {
                    await netLog(ns, "Removing log file %s, taking %s bytes", log, fmt.large(data.length));
                    ns.rm(log, "home");
                }
            }
        }

        await ns.sleep(10000);
    }
}
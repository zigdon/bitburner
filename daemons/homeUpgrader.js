import * as fmt from "/lib/fmt.js";
import {toast} from "/lib/log.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    while (true) {
        ns.print(`Next upgrades: RAM ${fmt.money(ns.getUpgradeHomeRamCost())}, Cores ${fmt.money(ns.getUpgradeHomeCoresCost())}`);
        if (ns.upgradeHomeCores()) {
            await toast(ns, 
                "Bought a new core for home server",
                {level: "success", timeout: 0});
            continue;
        }
        if (ns.upgradeHomeRam()) {
            await toast(ns, 
                "Home RAM upgraded to %s", fmt.memory(ns.getServerMaxRam("home")),
                {level: "success", timeout: 0});
            continue;
        }
        if (ns.getUpgradeHomeCoresCost() == Infinity &&
            ns.getUpgradeHomeRamCost() == Infinity) {
            await toast(ns, "No home upgrades left.", {level: "success", timeout: 0});
            break;
        }
        await ns.sleep(30000);
    }
}
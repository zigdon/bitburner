import * as fmt from "/lib/fmt.js";
import {toast} from "/lib/log.js";
import {settings} from "/lib/state.js";

let st;

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    st = settings(ns, "homeUpgrader");
    while (true) {
        ns.print(`Next upgrades: RAM ${fmt.money(ns.getUpgradeHomeRamCost())}, Cores ${fmt.money(ns.getUpgradeHomeCoresCost())}`);
        if (ns.getPlayer().money > ns.getUpgradeHomeCoresCost() + st.get("reserve") && ns.upgradeHomeCores()) {
            await toast(ns, 
                "Bought a new core for home server",
                {level: "success", timeout: 0});
            continue;
        }
        if (ns.getPlayer().money > ns.getUpgradeHomeRamCost()+ st.get("reserve") && ns.upgradeHomeRam()) {
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
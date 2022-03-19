import * as fmt from "/lib/fmt.js";
import {toast} from "/lib/log.js";
import {settings} from "/lib/state.js";

let st;

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    st = settings(ns, "buyprogs");
    if (ns.scan("home").filter((h) => {return h=="darkweb"}).length == 0) {
        ns.tprint("Waiting to purchase TOR");
        while (
            ns.getPlayer().money < 200000 + st.get("reserve") ||
            !ns.purchaseTor()) {
            await ns.sleep(1000);
        }
        await toast(ns, "Bought TOR", {level: "success"});
    }
    // name, m$, ram
    let progs = [
        ["BruteSSH", 1.5, 0],
        ["FTPCrack", 3, 0],
        ["relaySMTP", 15, 128],
        ["HTTPWorm", 30, 256],
        ["SQLInject", 250, 256],
        ["Formulas", 5000, 256],
    ];
    while (progs.length > 0) {
        let e = progs.shift();
        let name = e[0];
        let price = e[1];
        let ram = e[2];
        if (ns.fileExists(name + ".exe", "home")) {
            continue;
        }
        ns.tprintf("Waiting for %s to buy %s", fmt.money(price), name);
        while (
            ns.getPlayer().money < price + st.get("reserve") ||
            ns.getServerMaxRam("home") < ram ||
            !ns.purchaseProgram(name + ".exe")) {
            await ns.sleep(1000);
        }
        ns.tprintf("Bought %s", name);
        await toast(ns, "Bought %s", name, {level: "success"});
    }
}
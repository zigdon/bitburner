import * as zui from "/lib/ui.js";
import * as fmt from "/lib/fmt.js";
import {getPorts} from "/lib/ports.js";
import {toast} from "/lib/log.js";

let state = {};

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    const ports = getPorts();
    if (ns.fileExists("/conf/ui.txt", "home")) {
        state = JSON.parse(ns.read("/conf/ui.txt"));
        ns.print(`Loaded state: ${state}`);
    }
    await ns.writePort(ports.UI, "create income Income");
    let hist = [];
    let lastUpdate = 0;
    let updates = {};
    while (true) {
        await ns.sleep(1);
        let data = ns.readPort(ports.UI);

        let now = Date.now();
        let val = ns.getServerMoneyAvailable("home");
        hist.unshift({ts: now, val: val, delta: val-(hist[0] ? hist[0].val : 0)});
        while (hist.length > 0 && now - hist[0].ts> 60000) { hist.pop(); }
        let rate = hist.reduce((t, c) => t+c.delta, 0)/60;
        updates["income"] = `${fmt.money(rate)}/s`;
        
        for (let i of Object.values(state)) {
            if (now - i.lastSeen > i.timeout && !state[i.id].hidden) {
                zui.hideCustomOverview(i.id);
                state[i.id].hidden = true;
                ns.print(`Timeout for ${i.id}`);
            }
        }
        if (now - lastUpdate > 500) {
            for (let u of Object.entries(updates)) {
               zui.setCustomOverview(u[0], u[1]);
            }
            lastUpdate = now;
            updates = {};
        }
        if (data.startsWith("NULL")) {
            await ns.sleep(1000);
            continue;
        }
        let words = data.split(" ");
        let cmd = words.shift();
        let id = words.shift();
        switch (cmd) {
            case "create":
                let label = words.join(" ");
                ns.print(`Creating new chip ${id}: ${label}`)
                state[id] = {id: id, label: label, timeout: 10000, lastSeen: Date.now(), hidden: false};
                zui.rmCustomOverview(id);
                zui.customOverview(id, label);
                break;
            case "update":
                state[id] ||= {id: id, label: "unknown", timeout: 10000, lastSeen: Date.now(), hidden: false};
                state[id].lastSeen = Date.now();
                if (state[id].hidden) {
                    ns.print(`Restoring ${id}`);
                    zui.restoreCustomOverview(id);
                    state[id].hidden = false;
                }
                updates[id] = words.join(" ").replaceAll(/\\n/g, "<br/>");
                continue;
            case "timeout":
                state[id].timeout = words.shift();
                ns.print(`Setting timeout of chip ${id}: ${state[id].timeout}`);
                break;
            case "delete":
            case "remove":
                ns.print(`Removing chip ${id}`);
                zui.rmCustomOverview(id);
                delete state[id];
                break;
            case "restart":
                ns.spawn(ns.getScriptName());
                await toast(ns, "Restarting UI daemon...");
                break;
            default:
                ns.tprint(`Unknown command ${cmd}`);
                continue;
        }
        await saveState(ns);
    }
}

/** @param {NS} ns **/
async function saveState(ns) {
    await ns.write("/conf/ui.txt", JSON.stringify(state), "w");
}
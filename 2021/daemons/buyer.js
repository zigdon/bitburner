import * as fmt from "/lib/fmt.js";
import { console, netLog, toast } from "/lib/log.js";
import { ports } from "/lib/ports.js";
import { settings } from "/lib/state.js";
import { newUI } from "/lib/ui.js";

let installer = "/tools/install.js";
let assigner = "/tools/assigntargets.js";
let st;
let ui;

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("getServerMoneyAvailable");
	ns.disableLog("getServerMaxRam");
	ns.disableLog("sleep");
	st = settings(ns, "buyer");
	ui = await newUI(ns, "buyer", "Buyer");

	if (ns.getPurchasedServerLimit() == 0) {
		await toast(ns, "Can't purchase servers on this node, disabling buyer.", {level: "warning", timeout: 30000});
		ns.exit();
	}

	// start from whereever we stopped
	let ram = 16;
	if (ns.getPurchasedServers().length > 0) {
		ram = Math.min(...ns.getPurchasedServers().map(s => ns.getServerMaxRam(s)), ns.getPurchasedServerMaxRam());
	}

	let batchRam = Math.max(ns.getScriptRam("/daemons/batch.js"), 64);
	while (ram < batchRam
	    || ns.getPurchasedServerCost(ram) * 10 < ns.getServerMoneyAvailable("home")) {
		ram *= 2;
	}
	if (ram > ns.getPurchasedServerMaxRam()) {
		ram = ns.getPurchasedServerMaxRam();
	}
	await toast(ns, "Buying servers with %s for %s", fmt.memory(ram), fmt.money(ns.getPurchasedServerCost(ram)));
	await ui.update("waiting...");
	let updateUI = async function (m = "") {
		let obs = 0;
		let cur = 0;
		ns.getPurchasedServers().forEach(srv => ns.getServer(srv).maxRam >= ram ? cur++ : obs++);
		let t = ns.sprintf("%s (%s)\n%d/%d%s",
			fmt.money(ns.getPurchasedServerCost(ram)),
			fmt.memory(ram),
			obs, cur, m);
		await ui.update(t);
	}
	await updateUI();

	await toast(ns, "Waiting 1 minute before starting...");
	let start = Date.now();
	let max = ns.getPurchasedServerMaxRam();

	let idle = [];
	while (ram <= max) {
		let need = ns.getPurchasedServerCost(ram);

		await checkControl(ns, need);
		// Wait our startup timer
		if (Date.now() - start < 60000) {
			await ns.sleep(1000);
			continue;
		}

		// Figure out if we have servers to upgrade, as them to shut down if we're ready
		let qty = (ns.getServerMoneyAvailable("home")+st.read("reserve")) / need;
		let next = await getNextServer(ns, ram, qty);
		if (next == "<waiting>" || !qty) {
			await ns.sleep(10000);
			continue;
		}

		// wait until we have enough money
		await netLog(ns, "Waiting for %s, leaving %s in reserve", fmt.money(need), fmt.money(st.read("reserve")));
		while (ns.getServerMoneyAvailable("home") < need + st.read("reserve")) {
			if (st.read("buyerMode") != "idle") {
				while (idle.length > 0) {
					let h = idle.shift();
					switch (st.read("buyerMode")) {
						case "worker":
							ns.exec(installer, "home", 1, h, "worker");
							break;
						case "sharer":
							ns.exec(installer, "home", 1, h, "sharer");
							break;
						default:
							if (idle.length > 0) {
								let pid = ns.exec(assigner, "home", 1, "--quiet");
								while (ns.isRunning(pid, "home")) {
									await ns.sleep(500);
								}
							}
							ns.exec(installer, "home", 1, h, "batch");
							break;
					}
				}
			}
			await checkControl(ns, need);
			await ns.sleep(10000);
		}

		next = await getNextServer(ns, ram, (ns.getServerMoneyAvailable("home")-st.read("reserve")) / need);
		if (next == "<waiting>") {
			await ns.sleep(10000);
			continue;
		}


		// When we're out of servers to upgrade, aim higher
		if (next == "") {
			if (ram == max) {
				break;
			}
			let oldRam = ram;
			let rate = Math.log2(ram);
			if (rate < 10) {
				ram *= 2;
			} else if (rate < 20) {
				ram *= 4;
			} else {
				ram *= 8;
			}
			if (ram > max) {
				ram = max;
			}
			while (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram * 2) * 2 && ram < max) {
				ram *= 2;
			}
			await toast(ns, "Increasing server ram from %s to %s (%s)",
				fmt.memory(oldRam), fmt.memory(ram), fmt.money(ns.getPurchasedServerCost(ram)));
			await updateUI();
			continue;
		}

		// if the server exists, delete it
		if (ns.serverExists(next)) {
			await netLog(ns, "deleting obsolete server %s", next);
			ns.killall(next);
			ns.deleteServer(next);
		}

		await updateUI(".");
		next = ns.purchaseServer(next, ram);
		await netLog(ns, "bought new server %s with %s", next, fmt.memory(ram));
		idle.push(next);
		await ns.sleep(1000);
		await updateUI();
	}

	await toast(ns, "Bought max servers with max memory, done", { level: "success", timeout: 0 });
	await ui.remove();
}

/**
 * @param {NS} ns
 * @param {number} ram
 * @param {number} qty
 */
async function getNextServer(ns, ram, qty = 1) {
	// Find the next server to buy:
	// - missing
	let maxServers = ns.getPurchasedServerLimit();
	for (let i = 0; i < maxServers; i++) {
		let name = "pserv-" + i;
		if (!ns.serverExists(name)) {
			return name;
		}
	}

	// - too small, and idle
	qty = Math.floor(qty);
	await netLog(ns, "Turning down up to %d servers with less than %s", qty, fmt.memory(ram));
	let turndown = [];
	let servers = ns.getPurchasedServers()
		.map(s => [s, ns.getServerMaxRam(s)])
		.sort((a, b) => a[1] - b[1])
		.map(s => s[0]);
	for (let name of servers) {
		if (ns.getServerMaxRam(name) >= ram) {
			continue;
		}

		if (ns.ps(name).filter((p) => { return p.filename.startsWith("/bin") }).length == 0) {
			await netLog(ns, "%s is idle, upgrading.", name);
			return name;
		} 
		if (turndown.length >= qty) {
			break;
		} 

		turndown.push(name);
		if (ns.fileExists("obsolete.txt", name)) {
			await netLog(ns, "%s is already shutting down.", name);
			continue;
		}
		if (ns.fileExists("/conf/assignments.txt", name)) {
			await netLog(ns, "%s is obsolete, turning down.", name);
			ns.mv(name, "/conf/assignments.txt", "obsolete.txt");
			ns.scriptKill("/daemons/batch.js", name);
		} else {
			await netLog(ns, "marking bee %s obsolete.", name);
			await ns.scp("/conf/assignments.txt", name);
			ns.mv(name, "/conf/assignments.txt", "obsolete.txt");
		}
	}

	if (turndown.length > 0) {
		await netLog(ns, "No available servers, servers spinning down: %s", turndown.join(", "));
	} else {
		await netLog(ns, "No upgradable servers found.");
	}
	return turndown.length ? "<waiting>" : "";
}

/**
 * @param {NS} ns
 * @param {number} need
 * @param {number} reserve
 **/
async function checkControl(ns, need) {
	let words = ns.readPort(ports.BUYER_CTL).split(" ");
	switch (words[0]) {
		case "NULL":
			return
			break;
		case "report":
			await console(ns, "Waiting for %s, leaving %s in reserve", fmt.money(need, {digits:2 }), fmt.money(st.read("reserve")));
			break;
		case "quit":
			await toast(ns, "Buyer quitting...");
			await ui.remove();
			ns.exit();
		case "restart":
			await toast(ns, "Buyer restarting...");
			await ui.remove();
			ns.spawn(ns.getScriptName());
		default:
			ns.tprintf("Unknown control command: " + words.join(" "));
			ns.tprintf("cmds: quit, restart, report");
	}
}
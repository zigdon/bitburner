import * as fmt from "/lib/fmt.js";
import { console, netLog, toast } from "/lib/log.js";
import { getPorts } from "/lib/ports.js";

var installer = "/tools/install.js";
var assigner = "/tools/assigntargets.js";
var reserve = 0;
var mode = "none";
var ports = getPorts();

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("getServerMoneyAvailable");
	ns.disableLog("getServerMaxRam");
	ns.disableLog("sleep");

	if (ns.getPurchasedServerLimit() == 0) {
		await toast(ns, "Can't purchase servers on this node, disabling buyer.", {level: "warning", timeout: 30000});
		ns.exit();
	}

	if (ns.fileExists("/conf/buyerReserve.txt", "home")) {
		reserve = Math.floor(ns.read("/conf/buyerReserve.txt"));
	}
	if (ns.fileExists("/conf/buyerMode.txt", "home")) {
		mode = ns.read("/conf/buyerMode.txt");
	}

	// start from whereever we stopped
	var ram = 16;
	if (ns.getPurchasedServers().length > 0) {
		ram = ns.getPurchasedServers()
			.map(s => ns.getServerMaxRam(s))
			.reduce((m, c) => c < m ? c : m, ns.getPurchasedServerMaxRam());
	}

	var batchRam = Math.max(ns.getScriptRam("/daemons/batch.js"), 64);
	while (ram < batchRam
	    || ns.getPurchasedServerCost(ram) * 10 < ns.getServerMoneyAvailable("home")) {
		ram *= 2;
	}
	if (ram > ns.getPurchasedServerMaxRam()) {
		ram = ns.getPurchasedServerMaxRam();
	}
	await console(ns, "Buying servers with %s GB RAM for %s", fmt.int(ram), fmt.money(ns.getPurchasedServerCost(ram)));
	await ns.writePort(ports.UI, "create buyer Buyer");
	await ns.writePort(ports.UI, "update buyer waiting...");
	var updateUI = async function (m = "") {
		var obs = 0;
		var cur = 0;
		ns.getPurchasedServers().forEach(srv => ns.getServer(srv).maxRam == ram ? cur++ : obs++);
		var t = ns.sprintf("%s\n(%s)\n%d/%d%s",
			fmt.money(ns.getPurchasedServerCost(ram)),
			fmt.memory(ram),
			obs, cur, m);
		await ns.writePort(ports.UI, `update buyer ${t}`);
	}
	await updateUI();

	await console(ns, "Waiting 1 minute before starting...");
	var start = Date.now();
	var max = ns.getPurchasedServerMaxRam();

	var idle = [];
	while (ram <= max) {
		var need = ns.getPurchasedServerCost(ram);

		await checkControl(ns, need);
		if (Date.now() - start < 60000) {
			await ns.sleep(1000);
			continue;
		}
		var next = await getNextServer(ns, ram, ns.getServerMoneyAvailable("home") / need);
		if (next == "<waiting>") {
			await ns.sleep(1000);
			continue;
		}
		if (next == "") {
			if (ram == max) {
				break;
			}
			var oldRam = ram;
			var rate = Math.log2(ram);
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

		// wait until we have enough money
		await netLog(ns, "Waiting for %s, leaving %s in reserve", fmt.money(need), fmt.money(reserve));
		while (Math.floor(ns.getServerMoneyAvailable("home")) < need + reserve) {
			while (idle.length > 0) {
				var h = idle.shift();
				switch (mode) {
					case "batch":
						if (idle.length > 0) {
							var pid = ns.exec(assigner, "home", 1, "--quiet");
							while (ns.isRunning(pid, "home")) {
								await ns.sleep(500);
							}
						}
						ns.exec(installer, "home", 1, h, "batch");
						break;
					case "worker":
						ns.exec(installer, "home", 1, h, "worker");
						break;
					case "sharer":
						ns.exec(installer, "home", 1, h, "sharer");
						break;
					default:
						await console(ns, "bought new server %s with %s GB RAM, leaving idle", h, fmt.int(ram));
				}
			}
			await checkControl(ns, need);
			await ns.sleep(10000);
		}

		next = await getNextServer(ns, ram, ns.getServerMoneyAvailable("home") / need);
		if (next == "<waiting>") {
			await ns.sleep(1000);
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
		await netLog(ns, "bought new server %s with %s GB RAM", next, fmt.int(ram));
		idle.push(next);
		await ns.sleep(1000);
		await updateUI();
	}

	await toast(ns, "Bought max servers with max memory, done", { level: "success", timeout: 0 });
	await ns.writePort(ports.UI, "delete buyer");
}

/**
 * @param {NS} ns
 * @param {number} ram
 * @param {number} qty
 */
async function getNextServer(ns, ram, qty = 1) {
	// Find the next server to buy:
	// - missing
	var maxServers = ns.getPurchasedServerLimit();
	for (var i = 0; i < maxServers; i++) {
		var name = "pserv-" + i;
		if (!ns.serverExists(name)) {
			return name;
		}
	}

	// - too small, and idle
	qty = Math.floor(qty);
	var found = 0;
	var turndown = [];
	var servers = ns.getPurchasedServers()
		.map(s => [s, ns.getServerMaxRam(s)])
		.sort((a, b) => a[1] - b[1])
		.map(s => s[0]);
	for (var name of servers) {
		if (ns.getServerMaxRam(name) < ram) {
			if (ns.ps(name).filter((p) => { return p.filename.startsWith("/bin") }).length == 0) {
				await netLog(ns, "%s is idle, upgrading.", name);
				return name;
			} else if (!ns.fileExists("/conf/assignments.txt", name)) {
				await netLog(ns, "%s is shutting down.", name);
				found++;
				turndown.push(name);
			} else if (found < qty) {
				await netLog(ns, "%s is obsolete, turning down.", name);
				ns.mv(name, "/conf/assignments.txt", "obsolete.txt");
				ns.scriptKill("/daemons/batch.js", name);
				turndown.push(name);
				found++;
			}
		}
	}

	if (!found) {
		await netLog(ns, "Turning down up to %d servers with less than %s", qty, fmt.memory(ram));
		await netLog(ns, "No available servers, servers spinning down: ", turndown);
	}
	return found ? "<waiting>" : "";
}

/**
 * @param {string} s
 */
function parseMoney(s) {
	if (1 * s == s) {
		return 1 * s;
	}
	var unit = s.substr(-1);
	var val = s.substr(0, s.length - 1);
	switch (unit) {
		case "t":
			val *= 1000
		case "b":
			val *= 1000
		case "m":
			val *= 1000
		case "k":
			val *= 1000
	}
	return Math.floor(val);
}

/**
 * @param {NS} ns
 * @param {number} need
 * @param {number} reserve
 **/
async function checkControl(ns, need) {
	var words = ns.readPort(ports.BUYER_CTL).split(" ");
	switch (words[0]) {
		case "NULL":
			return
			break;
		case "reserve":
			reserve = parseMoney(words[1]);
			await console(ns, "Setting reserve to %s", fmt.money(reserve));
			await ns.write("/conf/buyerReserve.txt", reserve, "w");
			break;
		case "mode":
			mode = words[1];
			await console(ns, "Setting mode to %s", mode);
			await ns.write("/conf/buyerMode.txt", mode, "w");
			break;
		case "report":
			await console(ns, "Waiting for %s, leaving %s in reserve", fmt.money(need), fmt.money(reserve));
			break;
		case "quit":
			await console(ns, "quitting");
			await ns.writePort(ports.UI, "delete buyer");
			ns.exit();
		case "restart":
			await console(ns, "restarting...");
			ns.spawn(ns.getScriptName());
		default:
			ns.tprintf("Unknown control command: " + words.join(" "));
			ns.tprintf("cmds: reserve, quit, report");
	}
}
import * as fmt from "/lib/fmt.js";
import { console, netLog, toast } from "/lib/log.js";
import { getPorts } from "/lib/ports.js";

var script = "worker.js";
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
	var req = ns.getScriptRam(script);

	if (ns.fileExists("/conf/buyerReserve.txt", "home")) {
		reserve = Math.floor(ns.read("/conf/buyerReserve.txt"));
	}
	if (ns.fileExists("/conf/buyerMode.txt", "home")) {
		mode = ns.read("/conf/buyerMode.txt");
	}

	ns.print("req: " + req);

	var ram = 64;
	if (ns.serverExists("pserv-0")) {
		ram = ns.getServerMaxRam("pserv-0");
	}
	var batchRam = ns.getScriptRam("/daemons/batch.js");
	while (ram < batchRam) {
		ram *= 2;
	}
	await console(ns, "Buying servers with %s GB RAM for %s", fmt.int(ram), fmt.money(ns.getPurchasedServerCost(ram)));

	var max = ns.getPurchasedServerMaxRam();

	var idle = [];
	while (ram <= max) {
		var newReq = ns.getScriptRam(script);
		if (req != newReq) {
			await console(ns, "Updating required memory from %s GB to %s GB", fmt.int(req), fmt.int(newReq));
			req = newReq;
		}

		await checkControl(ns, need);
		var next = getNextServer(ns, ram);
		if (next == "<waiting>") {
			await toast(ns, "Waiting for server to shut down, try again later");
			return;
		}
		if (next == "") {
			if (ram == max) {
				break;
			}
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
			await toast(ns, "Increasing server ram to %s GB (%s)", fmt.int(ram), fmt.money(ns.getPurchasedServerCost(ram)));
			continue;
		}

		// wait until we have enough money
		var need = ns.getPurchasedServerCost(ram);
		await netLog(ns, "Waiting for %s, leaving %s in reserve", fmt.money(need), fmt.money(reserve));
		if (Math.floor(ns.getServerMoneyAvailable("home")) < need + reserve) {
			if (idle.length > 0) {
				var pid = ns.exec(assigner, "home");
				while (ns.isRunning(pid, "home")) {
					await ns.sleep(500);
				}
			}
			while (idle.length > 0) {
				var h = idle.shift();
				switch (mode) {
					case "batch":
						ns.exec(installer, "home", 1, h, "batch");
						break;
					case "worker":
						ns.exec(installer, "home", 1, h, "worker");
						break;
					default:
						await console(ns, "bought new server %s with %s GB RAM, leaving idle", h, fmt.int(ram));
				}
			}

			await toast(ns, "Need %s, try again later", fmt.money(need+reserve));
			return;
		}

		next = getNextServer(ns, ram);
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

		next = ns.purchaseServer(next, ram);
		await netLog(ns, "bought new server %s with %s GB RAM", next, fmt.int(ram));
		idle.push(next);
		await ns.sleep(1000);
	}

	await console(ns, "Bought max servers with max memory, done");
}

/**
 * @param {NS} ns
 * @param {int} ram
 */
function getNextServer(ns, ram) {
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
	var found = false;
	var turndown = [];
	for (var i = 0; i < maxServers; i++) {
		var name = "pserv-" + i;
		if (ns.getServerMaxRam(name) < ram) {
			if (ns.ps(name).filter((p) => { return p.filename.startsWith("/bin") }).length == 0) {
				ns.print(name, " is idle, upgrading.");
				return name;
			} else if (!ns.fileExists("/conf/assignments.txt", name)) {
				found = true;
				turndown.push(name);
			} else if (!found) {
				ns.print(name, " is obsolete, turning down.");
				ns.mv(name, "/conf/assignments.txt", "obsolete.txt");
				ns.scriptKill("/daemons/batch.js", name);
				turndown.push(name);
				found = true;
			}
		}
	}

	if (!found) {
		ns.print("No available servers, servers spinning down: ", turndown);
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
			ns.exit();
		case "restart":
			await console(ns, "restarting...");
			ns.spawn(ns.getScriptName());
		default:
			ns.tprintf("Unknown control command: " + words.join(" "));
			ns.tprintf("cmds: reserve, quit, report");
	}
}
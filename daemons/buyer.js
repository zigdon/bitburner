import * as fmt from "/lib/fmt.js";
import {console} from "/lib/log.js";

var script = "worker.js";
var installer = "/tools/install.js";
var reserve = 0;
var mode = "none";

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

	var ram = 2;
	if (ns.serverExists("pserv-0")) {
		ram = ns.getServerMaxRam("pserv-0");
	}
	var batchRam = ns.getScriptRam("/daemons/batch.js");
	while (ram < batchRam) {
		ram *= 2;
	}
	await console(ns, "Buying servers with %s GB RAM for $%s", fmt.int(ram), fmt.int(ns.getPurchasedServerCost(ram)));
	await console(ns, "Waiting 1 minute before starting...");
	await ns.sleep(60000);
	var max = ns.getPurchasedServerMaxRam();

	while (ram <= max) {
		var newReq = ns.getScriptRam(script);
		if (req != newReq) {
			await console(ns, "Updating required memory from %s GB to %s GB", fmt.int(req), fmt.int(newReq));
			req = newReq;
		}

		var next = getNextServer(ns, ram);
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
			while (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram*2)*2 && ram < max) {
				ram *= 2;
			}
			await console(ns, "Increasing server ram to %s GB ($%s)", fmt.int(ram), fmt.int(ns.getPurchasedServerCost(ram)));
			continue;
		}

		// wait until we have enough money
		var need = ns.getPurchasedServerCost(ram);
		await console(ns, "Waiting for $%s, leaving $%s in reserve", fmt.int(need), fmt.int(reserve));
		while (Math.floor(ns.getServerMoneyAvailable("home")) < need + reserve) {
			await checkControl(ns, need, reserve);
			await ns.sleep(10000);
		}

		// if the server exists, delete it
		if (ns.serverExists(next)) {
			await console(ns, "deleting obsolete server %s", next);
			ns.killall(next);
			ns.deleteServer(next);
		}
		
		next = ns.purchaseServer(next, ram);
		switch (mode) {
			case "batch":
				await console(ns, "bought new server %s with %s GB RAM, installing batch", next, fmt.int(ram));
				ns.exec(installer, "home", 1, next);
				break;
			case "worker":
				await console(ns, "bought new server %s with %s GB RAM, launching %d threads", next, fmt.int(ram), ram/req);
				await ns.scp(script, next);
				ns.exec(script, next, ram/req);
				break;
			default:
				await console(ns, "bought new server %s with %s GB RAM, leaving idle", next, fmt.int(ram));
		}
		await ns.sleep(1000);
	}

	await console(ns, "Bought max servers with max memory, done");
}

/**
 * @param {NS} ns
 * @param {int} ram
 */
function getNextServer(ns, ram) {
	// Find the next server to buy - either missing (less than limit), or has less than our target memory
	var maxServers = ns.getPurchasedServerLimit();
	for (var i = 0; i < maxServers; i++) {
		var name = "pserv-" + i;
		if (!ns.serverExists(name)) {
			return name;
		}
	}
	for (var i = 0; i < maxServers; i++) {
		var name = "pserv-" + i;
		if (ns.getServerMaxRam(name) < ram) {
			return name;
		}
	}

	return "";
}

/**
 * @param {string} s
 */
function parseMoney(s) {
	if (1*s == s) {
		return 1*s;
	}
	var unit = s.substr(-1);
	var val = s.substr(0, s.length-1);
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
async function checkControl(ns, need, reserve) {
	var words = ns.readPort(4).split(" ");
	switch (words[0]) {
		case "NULL":
			return
			break;
		case "reserve":
			reserve = parseMoney(words[1]);
			await console(ns, "Setting reserve to $%s", fmt.int(reserve));
			await ns.write("/conf/buyerReserve.txt", reserve, "w");
			break;
		case "mode":
			mode = words[1];
			await console(ns, "Setting mode to %s", mode);
			await ns.write("/conf/buyerMode.txt", mode, "w");
			break;
		case "report":
			await console(ns, "Waiting for $%s, leaving $%s in reserve", fmt.int(need), fmt.int(reserve));
			break;
		case "quit":
			await console(ns, "quitting");
			ns.quit();
		default:
			ns.tprintf("Unknown control command: " + words.join(" "));
			ns.tprintf("cmds: reserve, quit, report");
	}
}
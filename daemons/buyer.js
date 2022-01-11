var commaFmt = new Intl.NumberFormat('en-US', { useGrouping: true, maximumFractionDigits: 2});
var script = "worker.js";
var reserve = 0;

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("getServerMoneyAvailable");
	ns.disableLog("getServerMaxRam");
	ns.disableLog("sleep");
	var req = ns.getScriptRam(script);

	if (ns.fileExists("buyerReserve.txt", "home")) {
		reserve = Math.floor(ns.read("buyerReserve.txt"));
	}

	ns.print("req: " + req);

	var ram = 4;
	if (ns.serverExists("pserv-0")) {
		ram = ns.getServerMaxRam("pserv-0");
	}
	log(ns, "Buying servers with %s GB RAM for $%s", ram, commaFmt.format(ns.getPurchasedServerCost(ram)));
	log(ns, "Waiting 1 minute before starting...");
	await ns.sleep(60000);

	while (ram <= ns.getPurchasedServerMaxRam()) {
		var newReq = ns.getScriptRam(script);
		if (req != newReq) {
			log(ns, "Updating required memory from %d GB to %d GB", req, newReq);
			req = newReq;
		}

		var next = getNextServer(ns, ram);
		if (next == "") {
			if (ram == ns.getPurchasedServerCost()) {
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
			if (ram > ns.getPurchasedServerCost()) {
				ram = ns.getPurchasedServerCost();
			}
			log(ns, "Increasing server ram to %d GB ($%s)", ram, commaFmt.format(ns.getPurchasedServerCost(ram)));
			continue;
		}

		// wait until we have enough money
		var need = ns.getPurchasedServerCost(ram);
		log(ns, "Waiting for $%s, leaving $%s in reserve", commaFmt.format(need), commaFmt.format(reserve));
		while (Math.floor(ns.getServerMoneyAvailable("home")) < need + reserve) {
			await checkControl(ns, need, reserve);
			await ns.sleep(10000);
		}

		// if the server exists, delete it
		if (ns.serverExists(next)) {
			log(ns, "deleting obsolete server %s", next);
			ns.killall(next);
			ns.deleteServer(next);
		}
		
		next = ns.purchaseServer(next, ram);
		log(ns, "bought new server %s with %d GB RAM, launching %d threads", next, ram, ram/req);
		await ns.scp(script, next);
		ns.exec(script, next, ram/req);
		await ns.sleep(200);
	}

	log(ns, "Bought max servers with max memory, done");
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
			log(ns, "Setting reserve to $%s", commaFmt.format(reserve));
			await ns.write("buyerReserve.txt", reserve, "w");
			break;
		case "report":
			log(ns, "Waiting for $%s, leaving $%s in reserve", commaFmt.format(need), commaFmt.format(reserve));
			break;
		case "quit":
			log(ns, "quitting");
			ns.quit();
		default:
			log(ns, "Unknown control command: " + words.join(" "));
			log(ns, "cmds: reserve, quit, report");
	}
}

/**
 * @param {NS} ns
 * @param {string} tmpl
 * @param {string[]} ...args
 */
function log(ns, tmpl, ...args) {
    var now = new Date();
    tmpl = ns.sprintf("%s - %s", now.toLocaleTimeString("en-US", { timeZone: "PST" }), tmpl);
	var msg = ns.sprintf(tmpl, ...args);
	ns.print(msg);
	ns.tprintf(msg);
}
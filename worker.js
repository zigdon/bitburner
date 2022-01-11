/** @param {NS} ns **/
export async function main(ns) {
	var version = 11;
	ns.disableLog("sleep");
	var target = "";
	var cont = true;
	log(ns, "agent starting");
	await send(ns, "version %d", version);
	while (cont) {
		var words = await wait(ns);
		var target = words[1];
		var threads = words[2];
		var opts = {};
		if (threads) {
			opts = { threads: threads };
		}
		switch (words[0]) {
			case "ping":
				await send(ns, "version %d", version);
				await ns.sleep(10000);
				break;
			case "weaken":
				await ns.weaken(target, opts);
				await send(ns, "done weaken %s", target);
				break;
			case "grow":
				await ns.grow(target, opts);
				await send(ns, "done grow %s", target);
				break;
			case "hack":
				await ns.hack(target, opts);
				await send(ns, "done hack %s", target);
				break;
			case "quit":
				cont = false;
				break;
			default:
				log(ns, "unknown command: '%s'", words[0]);
		}
		await ns.sleep(1000);
	}
	log(ns, "quitting");
}

/**
 * @param {NS} ns
 */
async function wait(ns) {
    log(ns, "waiting...");
	var hostname = ns.getHostname();
	var port = ns.getPortHandle(2);
	var start = Date.now();
	while (true) {
		var head = port.peek();
		if (head == "ping") {
			return ["ping"];
		}
		if (head.startsWith(hostname + ":")) {
			head = await port.read();
			log(ns, "read: '%s'", head);
			var words = head.split(" ");
			if (Date.now() - words[1] > 20000) {
				log(ns, "ignoring obsolete message, %ds old", (Date.now() - words[1])/1000);
				continue;
			}
			return words.slice(2);
		}
		var idle = (Date.now() - start) / 1000;
		if (idle > 10) {
			log(ns, "idle for %d seconds", idle);
			await send(ns, "idle %d", idle);
			start = Date.now();
		}
		await ns.sleep(1000);
	}
}

/**
 * @param {NS} ns
 * @param {string} tmpl
 * @param {string[]} ..args
 */
async function send(ns, tmpl, ...args) {
	var hostname = ns.getHostname();
	var cmd = ns.sprintf(tmpl, ...args);
	log(ns, "sending %s", cmd);
	var msg = ns.sprintf("%s: %s", hostname, cmd);
	while (!await ns.tryWritePort(1, msg)) {
		log(ns, "waiting to write to port!")
		await ns.sleep(100);
	}
}

/**
 * @param {NS} ns
 * @param {string} tmpl
 * @param {string[]} ..args
 */
function log(ns, tmpl, ...args) {
    var now = new Date();
    tmpl = ns.sprintf("%s - %s", now.toLocaleTimeString("en-US", { timeZone: "PST" }), tmpl);
	ns.print(ns.sprintf(tmpl, ...args));
}
import {netLog} from "/lib/log.js";
import * as fmt from "/lib/fmt.js";
import {settings} from "/lib/state.js";

let st;

/** @param {NS} ns **/
export async function main(ns) {
	let version = 13;
	st = settings(ns, "worker");
	let hostname = ns.getHostname();
	if (hostname.startsWith("pserv-")) {
		if (st.read("usePurchasedBees")) {
			ns.print("Leaving purchased bee alone")
			return;
		}
	} else if (hostname.startsWith("hacknet-node-")) {
	    if (st.read("useHacknetBees")) {
			ns.print("Leaving hacknet bee alone")
			return;
		}
	} else if (st.read("useWildBees")) {
		ns.print("Leaving wild bee alone")
		return;
	}
	ns.disableLog("sleep");

	let cont = true;
	await netLog(ns, "agent starting");
	await send(ns, "version %d", version);
	while (cont) {
		let words = await wait(ns);
		let target = words[1];
		let threads = words[2];
		let opts = {};
		let got;
		if (threads) {
			opts = { threads: threads };
		}
		switch (words[0]) {
			case "ping":
				await send(ns, "version %d", version);
				await ns.sleep(10000);
				break;
			case "weaken":
				got = await ns.weaken(target, opts);
				await send(ns, "done weaken %s", target);
				await netLog(ns, "Weakened %s by %.2f", target, got);
				break;
			case "grow":
				got = await ns.grow(target, opts);
				await send(ns, "done grow %s", target);
				await netLog(ns, "Grew %s by %.2f%%", target, (got-1)*100);
				break;
			case "hack":
				got = await ns.hack(target, opts);
				await send(ns, "done hack %s", target);
				await netLog(ns, "Hacked %s for $%s", target, fmt.int(got));
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
	let hostname = ns.getHostname();
	let port = ns.getPortHandle(2);
	let start = Date.now();
	while (true) {
		let head = port.peek();
		if (head == "ping") {
			return ["ping"];
		}
		if (head.startsWith(hostname + ":")) {
			head = await port.read();
			log(ns, "read: '%s'", head);
			let words = head.split(" ");
			if (Date.now() - words[1] > 20000) {
				log(ns, "ignoring obsolete message, %ds old", (Date.now() - words[1])/1000);
				continue;
			}
			return words.slice(2);
		}
		let idle = (Date.now() - start) / 1000;
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
	let hostname = ns.getHostname();
	let cmd = ns.sprintf(tmpl, ...args);
	log(ns, "sending %s", cmd);
	let msg = ns.sprintf("%s: %s", hostname, cmd);
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
    let now = new Date();
    tmpl = ns.sprintf("%s - %s", now.toLocaleTimeString("en-US", { timeZone: "PST" }), tmpl);
	ns.print(ns.sprintf(tmpl, ...args));
}
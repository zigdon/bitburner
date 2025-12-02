import * as fmt from "/lib/fmt.js";
import { log, console, toast } from "/lib/log.js";
import { installWeaken, installWorker, installSharer } from "/tools/install.js";
import { go } from "/lib/hosts.js";
import { settings } from "/lib/state";

let nextHack = [];
let myHack = 0;
let workerScript = "/daemon/worker.js";
let batchScript = "/daemons/batch.js";
let weakenScript = "/daemons/weakener.js";
let sharerScript = "/daemons/sharer.js";
let controllerScript = "/daemons/controller.js";
let scanScript = "/tools/scan.js";
let droneMode = "bee";
let msg = console;
let st;

let shouldBackdoor = (h) =>
  h.host.includes("fitness") ||
  h.host.includes("uni") ||
  h.max == 0 && !h.host.startsWith("pserv") && h.host != "home" && h.host != "darkweb" && !h.host.startsWith("hacknet-node-");

/** @param {NS} ns **/
export async function main(ns) {
  st = settings(ns, "search");
  let flags = ns.flags([
    ["quiet", false],
  ])
  if (flags.quiet) {
    log(ns, "Applying --quiet flag");
    msg = log;
  }

  if (ns.args[0]) {
    droneMode = ns.args[0];
    await msg(ns, "mode manually set to %s", droneMode);
  } else {
    if (ns.ps("home").filter((s) => { return s.filename == "/daemons/share.js" }).length > 0) {
      droneMode = "sharer";
      await msg(ns, "mode set to %s via /daemons/share.js", droneMode);
    } else if (st.read("hiveBatching")) {
      droneMode = "bee";
      await msg(ns, "mode set to %s via hiveBatching setting", droneMode);
    } else if (ns.ps("home").filter((s) => { return s.filename == "/daemons/controller.js" }).length > 0) {
      droneMode = "worker";
      await msg(ns, "mode set to %s via /daemons/controller.js setting", droneMode);
    } else if (ns.getPurchasedServers().length > 3) {
      droneMode = "weaken";
      await msg(ns, "mode set to %s as fallback", droneMode);
    }
  }
  await msg(ns, "Drone mode: %s", droneMode);
  let found = {};
  let openers = [];
  nextHack = [0, 0, 0, 0, 0, 0];

  ns.disableLog("ALL");
  myHack = ns.getHackingLevel();
  log(ns, "hack level: " + myHack);

  let progs = [
    { file: "BruteSSH.exe", func: ns.brutessh },
    { file: "FTPCrack.exe", func: ns.ftpcrack },
    { file: "HTTPWorm.exe", func: ns.httpworm },
    { file: "relaySMTP.exe", func: ns.relaysmtp },
    { file: "SQLInject.exe", func: ns.sqlinject },
  ];
  progs.forEach(function (p) {
    if (ns.fileExists(p.file, "home")) {
      openers.unshift(p.func);
    }
  });
  log(ns, "Found " + openers.length + " openers.");

  let hacked = await scanFrom(ns, "home", "", 0, found, openers);

  if (hacked.length > 0) {
    await msg(ns, "hacked %d hosts:", hacked.length);
    for (let h in hacked) {
      let host = hacked[h];
      await msg(ns, "%s: %d $%s", host.host, host.hack, fmt.int(host.max));
    };
    ns.exec(scanScript, "home");
  }

  let done = true;
  if (!nextHack.every(p => p == 0)) {
    done = false;
    await msg(ns, "*** Next hacking levels:",);
    let out = [];
    nextHack.forEach(function (l, i) {
      if (l.lvl) { out.push(["  %d: %d (%s)", i, l.lvl, l.host]) };
    })
    for (let o in out) {
      let line = out[o];
      await msg(ns, ...line)
    }
  }

  if (done) {
    await toast(ns, "*** Nothing left to hack. Disabling job.", { level: "success", timeout: 0 });
    ns.exec("/tools/send.js", "home", 1, "cron", "pause", "search");
  }
}

/**
 *  @typedef opener
 *  @property {string} file
 *  @property {function} func
 *
 *  @param {NS} ns
 * 	@param {string} host
 *  @param {string} parent
 *  @param {int} depth
 *  @param {Object} found
 *  @param {opener[]} openers
 *  **/
async function scanFrom(ns, host, parent, depth, found, openers) {
  let server = ns.getServer(host);
  let hacked = [];
  let h = {
    depth: depth,
    host: host,
    root: server.hasAdminRights,
    hack: server.requiredHackingSkill,
    hackTime: ns.getHackTime(host),
    growth: server.serverGrowth,
    growthTime: ns.getGrowTime(host),
    backdoor: server.backdoorInstalled,
    max: server.moneyMax,
    ports: server.numOpenPortsRequired,
    children: [],
    parent: parent,
  };
  found[host] = h;

  if (found[parent]) {
    found[parent].children.unshift(host);
  }
  if (h.root) {
    if (host != "home" && !host.startsWith("pserv-") && !host.startsWith("hacknet-node-")) {
      if (droneMode == "weaken" && !ns.scriptRunning(weakenScript, host)) {
        await log(ns, "Starting weakener on %s", host);
        await installWeaken(ns, host);
      } else if (droneMode == "sharer" && !ns.scriptRunning(sharerScript, host)) {
        await log(ns, "Starting sharer on %s", host);
        await installSharer(ns, host);
      } else if (droneMode == "worker" &&
        !ns.scriptRunning(workerScript, host) &&
        !ns.scriptRunning(controllerScript, host)) {
        await log(ns, "Starting worker on %s", host);
        await installWorker(ns, host);
      }
    }
  } else if (h.ports <= openers.length) {
    await doPorts(ns, host, openers);
  }

  if (!h.root) {
    if (h.hack <= myHack && h.ports <= openers.length) {
      await doHack(ns, host, openers);
      hacked.push(h);
    } else if (!nextHack[h.ports] || nextHack[h.ports].lvl > h.hack) {
      await log(ns, "Can't hack %s, need %d ports", host, h.ports);
      nextHack[h.ports] = { lvl: h.hack, host: host };
    }
  }
  if (!h.backdoor && h.hack <= myHack && shouldBackdoor(h)) {
    if (host != "w0r1d_d43m0n") {
      await doBackdoor(ns, host);
    } else {
      await toast(ns, "w0r1d_d43m0n is availble", { level: "success", timeout: 0 });
    }
  }

  let hosts = ns.scan(host);
  for (let i = 0; i < hosts.length; i++) {
    if (hosts[i] == parent) {
      continue;
    }
    let hs = await scanFrom(ns, hosts[i], host, depth + 1, found, openers);
    hs.forEach((h) => { hacked.push(h) });
  }

  return hacked;
}

/**
 * @param {NS} ns
 * @param {string} host
 */
async function doBackdoor(ns, host) {
  try {
    if (go(ns, host)) {
      await msg(ns, "installing backdoor on %s", host);
      await ns.installBackdoor();
    } else {
      await msg(ns, "Failed to go to %s", host);
      ns.toast("Install backdoor on " + host, "info", null);
    }
  } catch (error) {
    await msg(ns, "Error installing backdoor on %s: %s", host, error);
    ns.toast("Install backdoor on " + host, "info", null);
  }
  ns.connect("home");
}

/**
 * @param {NS} ns
 * @param {string} host
 * @param {Array} openers
 */
async function doPorts(ns, host, openers) {
  let ports = ns.getServerNumPortsRequired(host);
  log(ns, "Trying " + openers.length + " openers on " + host);
  openers.forEach(function (f) {
    if (f(host) <= 0) {
      msg(ns, "can't run %s on %s", f, host);
      return;
    }
    ports--;
  });

  if (ports > 0) {
    await msg(ns, "couldn't open enough ports on %s", host);
    return;
  }
}

/**
 * @param {NS} ns
 * @param {string} host
 */
async function doHack(ns, host) {
  log(ns, "running nuke on " + host);
  ns.nuke(host);
  await msg(ns, "hacked %s", host);

}
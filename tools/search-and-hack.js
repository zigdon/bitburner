import * as fmt from "/lib/fmt.js";
import {log, console} from "/lib/log.js";
import {installWeaken, installWorker, installSharer} from "/tools/install.js";
import {go} from "/lib/hosts.js";

var nextHack = [];
var myHack = 0;
var workerScript = "/daemon/worker.js";
var batchScript = "/daemons/batch.js";
var weakenScript = "/daemons/weakener.js";
var sharerScript = "/daemons/sharer.js";
var controllerScript = "/daemons/controller.js";
var scanScript = "/tools/scan.js";
var droneMode = "worker";

/** @param {NS} ns **/
export async function main(ns) {
  if (ns.args[0]) {
    droneMode = ns.args[0];
  } else {
    if (ns.ps("home").filter((s) => {return s.filename == "/daemons/share.js"}).length > 0) {
      droneMode = "sharer";
    } else if (ns.ps("home").filter((s) => {return s.filename == "/daemons/controller.js"}).length > 0) {
      droneMode = "worker";
    } else if (ns.getPurchasedServers().length > 3) {
      droneMode = "weaken";
    }
  }
  await console(ns, "Drone mode: %s", droneMode);
  var found = new Map();
  var openers = [];
  nextHack = [];

  if (found.length > 0) {
    await console(ns, "previous instance not reset");
    ns.exit();
  }
  ns.disableLog("ALL");
  myHack = ns.getHackingLevel();
  log(ns, "hack level: " + myHack);

  var progs = [
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

  var hacked = await scanFrom(ns, "home", "", 0, found, openers);

  if (hacked.length > 0) {
    await console(ns, "hacked %d hosts:", hacked.length);
    for (var h in hacked) {
      var host = hacked[h];
      await console(ns, "%s: %d $%s", host.host, host.hack, fmt.int(host.max));
    };
    ns.exec(scanScript, "home");
  }


  await console(ns, "*** Next hacking levels:");
  var out = [];
  nextHack.forEach(function(l, i) {
    out.push(["  %d: %d (%s)", i, l.lvl, l.host]);
  })
  for (var o in out) {
    await console(ns, ...out[o]);
  }
}

/**
 *  @param {NS} ns
 * 	@param {string} host
 *  @param {string} parent
 *  @param {int} depth
 *  @param {Map} found
 *  @param {Array} openers
 *  **/
async function scanFrom(ns, host, parent, depth, found, openers) {
  var server = ns.getServer(host);
  var hacked = [];
  var h = {
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
  found.set(host, h);

  if (found.has(parent)) {
    found.get(parent).children.unshift(host);
  }
  if (h.root) {
    try {
      if (!h.backdoor && !h.host.startsWith("pserv-") && h.max == 0) {
        await console(ns, "installing backdoor on %s", h.host);
        if (go(ns, h.host)) {
          await ns.installBackdoor()
          go(ns, "home");
        }
      }
    } catch (error) {
      await console(ns, "error installing backdoor on %s: %s", h.host, error);
    }
    if (!ns.scriptRunning(workerScript, host) &&
      !ns.scriptRunning(batchScript, host) &&
      host.startsWith("pserv-")) {
      log(ns, "%s: can be hacking", host);
    } else if ( host != "home" && !host.startsWith("pserv-")) {
      if (droneMode == "weaken" && !ns.scriptRunning(weakenScript, host)) {
        await log(ns, "Starting weakener on %s", host);
        await installWeaken(ns, host);
      } else if (droneMode == "sharer" && !ns.scriptRunning(sharerScript, host)) {
        await log(ns, "Starting sharer on %s", host);
        await installSharer(ns, host);
      } else if ( droneMode = "worker" &&
        !ns.scriptRunning(workerScript, host) &&
        !ns.scriptRunning(controllerScript, host)) {
        await log(ns, "Starting worker on %s", host);
        await installWorker(ns, host);
      }
    }
  } else if (h.hack <= myHack && h.ports <= openers.length) {
    // ns.tprint(host + ": should hack");
    await doHack(ns, host, openers);
    hacked.push(h);
  } else if (!nextHack[h.ports] || nextHack[h.ports].lvl > h.hack) {
    nextHack[h.ports] = {lvl: h.hack, host: host};
  }

  var hosts = ns.scan(host);
  for (var i = 0; i < hosts.length; i++) {
    if (hosts[i] == parent) {
      continue;
    }
    var hs = await scanFrom(ns, hosts[i], host, depth + 1, found, openers);
    hs.forEach((h) => {hacked.push(h)});
  }

  return hacked;
}

/**
 * @param {NS} ns
 * @param {string} host
 * @param {Array} openers
 */
async function doHack(ns, host, openers) {
  var ports = ns.getServerNumPortsRequired(host);
  log(ns, "Trying " + openers.legnth + " openers on " + host);
  openers.forEach(function (f) {
    if (f(host) <= 0) {
      console(ns, "can't run %s on %s", f, host);
      return;
    }
    ports--;
  });

  if (ports > 0) {
    await console(ns, "couldn't open enough ports on %s", host);
    return;
  }

  log(ns, "running nuke on " + host);
  ns.nuke(host);
  await console(ns, "hacked %s", host);

  if (ns.getServerMaxMoney(host) == 0 && host != "darkweb") {
    try {
      if (go(ns, host)) {
        await console(ns, "installing backdoor on %s", host);
        await ns.installBackdoor();
      } else {
        await console(ns, "Failed to go to %s", host);
        ns.connect("home");
        ns.toast("Install backdoor on " + host, "info", null);
      }
    } catch (error) {
      await console(ns, "Error installing backdoor on %s: %s", h.host, error);
      ns.toast("Install backdoor on " + host, "info", null);
    }
  }
}
import * as fmt from "/lib/fmt.js";
import {log, console} from "/lib/log.js";
import {installWeaken} from "/tools/install.js";

var nextHack = [];
var myHack = 0;
var workerScript = "worker.js";
var batchScript = "/daemons/batch.js";
var weakenScript = "/daemons/weakener.js";

/** @param {NS} ns **/
export async function main(ns) {
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
    // if (!h.backdoor) {
    //   ns.tprintf("%s: installing backdoor");
    //   await ns.installBackdoor();
    // }
    if (!ns.scriptRunning(workerScript, host) &&
      !ns.scriptRunning(batchScript, host) &&
      host.startsWith("pserv-")) {
      log(ns, "%s: can be hacking", host);
    } else if (!ns.scriptRunning(weakenScript, host) &&
      host != "home" &&
      !host.startsWith("pserv-")) {
        await console(ns, "Starting weakener on %s", host);
        await installWeaken(ns, host);
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
}
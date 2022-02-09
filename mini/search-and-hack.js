import * as fmt from "/lib/fmt.js";
import {log, console, toast} from "/lib/log.js";
import {go} from "/lib/hosts.js";

var nextHack = [];
var myHack = 0;
var scanScript = "/mini/scan.js";
var installScript = "/mini/install.js";
var msg = console;

/** @param {NS} ns **/
export async function main(ns) {
    var flags = ns.flags([
        ["quiet", false],
    ])
    if (flags.quiet) {
        log(ns, "Applying --quiet flag");
        msg = log;
    }
    
  var found = new Map();
  var openers = [];
  nextHack = [0, 0, 0, 0, 0, 0];

  if (found.length > 0) {
    await msg(ns, "previous instance not reset");
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
    await msg(ns, "hacked %d hosts:", hacked.length);
    for (var h in hacked) {
      var host = hacked[h];
      await msg(ns, "%s: %d $%s", host.host, host.hack, fmt.int(host.max));
    };
    ns.exec(scanScript, "home");
    ns.exec(installScript, "home");
  }

  if (!nextHack.every(p => p == 0)) {
    await msg(ns, "*** Next hacking levels:");
    var out = [];
    nextHack.forEach(function(l, i) {
      if (l.lvl) { out.push(["  %d: %d (%s)", i, l.lvl, l.host]) };
    })
    for (var o in out) {
      var line = out[o];
      await msg(ns, ...line)
    }
  } else {
    await toast(ns, "*** Nothing left to hack. Disabling job.", {level: "success", timeout: 0});
    ns.exec("/tools/send.js", "home", 1, "cron", "pause", "search");
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
  if (!h.root && h.hack <= myHack && h.ports <= openers.length) {
    // ns.tprint(host + ": should hack");
    await doHack(ns, host, openers);
    hacked.push(h);
  } else if (!h.root && (!nextHack[h.ports] || nextHack[h.ports].lvl > h.hack)) {
    await log(ns, "Can't hack %s, need %d ports", host, h.ports);
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
      log(ns, "can't run %s on %s", f, host);
      return;
    }
    ports--;
  });

  if (ports > 0) {
    await msg(ns, "couldn't open enough ports on %s", host);
    return;
  }

  log(ns, "running nuke on " + host);
  ns.nuke(host);
  await msg(ns, "hacked %s", host);

  if (ns.getServerMaxMoney(host) == 0 && host != "darkweb") {
    await toast(ns, "Install backdoor on %s", host, {timeout: 0});
  }
}
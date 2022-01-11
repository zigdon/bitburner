import * as fmt from "lib/fmt.js";

var targetMax = 0;
var nextHack = [];
var myHack = 0;
var script = "worker.js";

/** @param {NS} ns **/
export async function main(ns) {
  var found = new Map();
  var openers = [];
  nextHack = [];

  if (found.length > 0) {
    ns.print("previous instance not reset");
    ns.tprint("previous instance not reset");
    ns.exit();
  }
  ns.disableLog("ALL");
  if (ns.fileExists("targets.txt", "home")) {
    ns.read("targets.txt").split(" ").forEach((t) => {
      var max = ns.getServerMaxMoney(t);
      ns.tprintf("Current target: %s $%s", t, fmt.int(max));
      if (targetMax < max) {
        targetMax = max;
      }
    })
  }
  myHack = ns.getHackingLevel();
  ns.print("hack level: " + myHack);

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
  ns.print("Found " + openers.length + " openers.");

  var hacked = await scanFrom(ns, "home", "", 0, found, openers);

  // printFrom(ns, "home", found);

  /*  print hosts that need hacking */
  found.forEach(function (host) {
    if (host.root || host.hack > myHack || host.ports > openers.length) {
      return
    }
    var trail = [host.host];
    var parent = host.parent;
    while (found.has(parent)) {
      trail.unshift(parent);
      parent = found.get(parent);
    }
    trail.unshift("~");
    ns.tprintf("%s: %d (%s) $%s", host.host, host.hack, trail.join("> "), fmt.int(host.max));
  });

  if (hacked.length > 0) {
    ns.tprintf("hacked %d hosts:", hacked.length);
    hacked.forEach(function (host) {
      ns.tprintf("%s: %d $%s", host.host, host.hack, fmt.int(host.max));
    });
  }

  ns.tprintf("*** Next hacking levels:");
  nextHack.forEach(function(l, i) {
    ns.tprintf("  %d: %d (%s)", i, l.lvl, l.host);
  })
}

/**
 * @param {NS} ns
 * @param {string} host
 * @param {Map} found
 */
function printFrom(ns, host, found) {
  var h = found.get(host);
  var prefix = " ".repeat(h.depth);
  ns.tprintf("%s%s: %s %d %s", prefix, h.host, h.root, h.hack, fmt.int(h.max));
  h.children.forEach(function (h) {
    printFrom(ns, h, found);
  });
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

  // ns.tprintf("%s: %s", host, h.root);
  if ((h.root || (h.hack <= myHack && h.ports <= openers.length)) && h.max > targetMax) {
    ns.tprintf("New potential target: %s - $%s (gTime: %s, hTime: %s)",
       host, fmt.int(h.max), fmt.time(h.growthTime), fmt.time(h.hackTime));
  }

  if (found.has(parent)) {
    found.get(parent).children.unshift(host);
  }
  if (h.root) {
    // if (!h.backdoor) {
    //   ns.tprintf("%s: installing backdoor");
    //   await ns.installBackdoor();
    // }
    if (!ns.scriptRunning(script, host) && host != "home") {
      ns.tprintf("%s: should be hacking", host);
      await runScript(ns, host);
    }
  } else if (h.hack <= myHack && h.ports <= openers.length) {
    ns.tprint(host + ": should hack");
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
  ns.print("Trying " + openers.legnth + " openers on " + host);
  openers.forEach(function (f) {
    if (f(host) <= 0) {
      ns.tprintf("can't run %s on %s", f, host);
      return;
    }
    ports--;
  });

  if (ports > 0) {
    ns.tprintf("couldn't open enough ports on %s", host);
    return;
  }

  ns.print("running nuke on " + host);
  ns.nuke(host);
  ns.tprintf("hacked %s", host);
  await runScript(ns, host);
}

/**
 * @param {NS} ns
 * @param {string} host
 */
async function runScript(ns, host) {
  var sR = ns.getScriptRam(script, "home");
  var n = ns.getServerMaxRam(host) / sR;
  if (n < 1) {
    ns.tprintf("Not enough memory on %s to be hacking.", host);
    return;
  }
  ns.tprintf("Launching %d threads on %s", n, host);
  await ns.scp(script, "home", host);
  ns.exec(script, host, n);
}
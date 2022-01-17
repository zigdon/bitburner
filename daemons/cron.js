import * as fmt from "/lib/fmt.js";
import { console, netLog } from "/lib/log.js";

var schedule = new Map();

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  await netLog(ns, "Cron daemon starting up");
  schedule = await loadSchedule(ns);

  while (true) {
    await ns.sleep(10000);
    checkCtl(ns);

    var now = Date.now();
    for (var k in schedule) {
      var j = schedule.get(k);
      if (now > j.nextRun && !j.paused) {
        await netLog(ns, "launching %s on %s", k, j.host);
        j.lastRun = now;
        j.nextRun = now + when + Math.random() * j.jitter;
        ns.exec(j.proc, j.host, j.threads, j.args);
      }
    }
  }
}

/**
 * @param {NS} ns
 * @returns {Map<string,Object>}
 */
async function loadSchedule(ns) {
  schedule = new Map();

  if (ns.fileExists("/lib/cron.txt")) {
    await netLog(ns, "Loading cron from /lib/cron.txt");
    var data = ns.read("/lib/cron.txt").split("\n");
    var now = Date.now();
    data.forEach((l) => {
      var words = l.trim().split(" ");
      var entry = {
        name: words.shift(),
        when: fmt.parseTime(words.shift()),
        host: words.shift(),
        threads: words.shift(),
        jitter: fmt.parseTime(words.shift()),
        proc: words.shift(),
        args: words,
        nextRun: 0,
        paused: false,
      };
      entry.nextRun = Math.random() * 30000 + Math.random() * entry.jitter;
      schedule.set(entry.name, entry);
    });
  }
  await netLog(ns, "Loaded schedule: %d jobs", schedule.size);

  return schedule;
}

/**
 * @param {NS} ns
 * @param {Map<string,Object>} schedule
 */
async function saveSchedule(ns) {
  await netLog(ns, "Saving cron to /lib/cron.txt");
  var data = [];
  schedule.forEach((entry) => {
    data.push([
      entry.name,
      entry.when,
      entry.host,
      entry.threads,
      entry.jitter,
      entry.proc,
      entry.args,
    ].join("\t"));
  });
  await ns.write("/lib/cron.txt", data.join("\n"), "w");
}

/**
 * @param {NS} ns
 */
async function checkCtl(ns) {
  var data = ns.readPort(8);
  await netLog("Control command: %s", data);
  if (data.startsWith("NULL")) {
    return;
  }

  var words = data.split(" ");
  var cmd = words.shift();
  switch (cmd) {
    case "quit":
      await console(ns, "cron daemon quitting");
      await saveSchedule(ns);
      ns.exit();
      break;
    case "list":
      for (var { k, v } in schedule) {
        await console(ns, printJob(v));
      }
      break;
    case "add":
      var j = {
        name: words.shift(),
        host: words.shift(),
        when: fmt.parseTime(words.shift()),
        jitter: fmt.parseTime(words.shift()),
        threads: words.shift(),
        proc: words.shift(),
        args: words,
      }
      var res = await ns.prompt("Create new job?\n" + printJob(ns, j));
      if (res) {
        schedule.set(j.name, j)
        saveSchedule(ns);
        await console(ns, "New job added: %s", j.name);
      } else {
        await console(ns, "Aborted!");
      }
      break;
    case "edit":
      await console(ns, "edit not implemented");
      break;
    case "pause":
      var name = words.shift()
      if (schedule.has(name)) {
        var j = schedule.get(name);
        j.paused = true;
        schedule.set(name, j);
        await console(ns, "Paused %s", j.name);
      }
      break;
    case "resume":
      var name = words.shift()
      if (schedule.has(name)) {
        var j = schedule.get(name);
        j.paused = true;
        schedule.set(name, j);
        var next = j.nextRun;
        var now = Date.now();
        if (now > j.nextRun) {
          next = "soon";
        } else {
          next = fmt.time(j.nextRun - now);
        }
        await console(ns, "Resumed %s, next run at %s", j.name, next);
      }
      break;
    case "del":
      await console(ns, "del not implemented");
      break;
    default:
      await console(ns, "Unknown command: %s", cmd);
  }
}

/**
 * @param {NS} ns
 * @param {Object} j
 */
function printJob(ns, j) {
  return ns.sprintf(
    "%s: on %s every %s (+-%s). Threads: %s, next: %s\n   %s %s",
    j.name,
    j.host,
    fmt.time(j.when),
    fmt.time(j.jitter),
    j.threads,
    j.paused ? "paused" : fmt.time(j.nextRun),
    j.proc,
    j.args,
  );

}
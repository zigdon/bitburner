import * as fmt from "/lib/fmt.js";
import { console, netLog } from "/lib/log.js";

var schedule = new Map();

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  ns.disableLog("exec");
  await netLog(ns, "Cron daemon starting up");
  schedule = await loadSchedule(ns);

  while (true) {
    await checkCtl(ns);
    await ns.sleep(10000);

    var now = Date.now();
    var toRun = [];
    schedule.forEach((j) => {
      if (now > j.nextRun && !j.paused) {
        toRun.push(j)
      }
    })

    while (toRun.length > 0) {
      var j = toRun.shift();
      await netLog(ns, "launching %s on %s", j.name, j.host);
      j.lastRun = now;
      j.nextRun = now + j.when + Math.random() * j.jitter;
      ns.exec(j.proc, j.host, j.threads, ...j.args);
      schedule.set(j.name, j);
    }
  }
}

/**
 * @param {NS} ns
 * @returns {Map<string,Object>}
 */
async function loadSchedule(ns) {
  schedule = new Map();

  if (ns.fileExists("/conf/cron.txt")) {
    await netLog(ns, "Loading cron from /conf/cron.txt");
    var data = ns.read("/conf/cron.txt").split("\n");
    if (!data || data.length == 0) {
      return schedule;
    }
    var now = Date.now();
    data.forEach((l) => {
      if (!l) { return }
      var words = l.trim().split("\t");
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
  await netLog(ns, "Loaded schedule: %d jobs:", schedule.size);
  for (let j of schedule.values()) {
    await netLog(ns, printJob(ns, j));
  }

  return schedule;
}

/**
 * @param {NS} ns
 * @param {Map<string,Object>} schedule
 */
async function saveSchedule(ns) {
  await netLog(ns, "Saving cron to /conf/cron.txt");
  var data = [];
  schedule.forEach((entry) => {
    data.push([
      entry.name,
      fmt.time(entry.when),
      entry.host,
      entry.threads,
      fmt.time(entry.jitter),
      entry.proc,
      entry.args,
    ].join("\t"));
  });
  await ns.write("/conf/cron.txt", data.join("\n"), "w");
}

/**
 * @param {NS} ns
 */
async function checkCtl(ns) {
  var data = ns.readPort(8);
  if (data.startsWith("NULL")) {
    return;
  }
  await netLog(ns, "Control command: %s", data);

  var words = data.split(" ");
  var cmd = words.shift();
  switch (cmd) {
    case "quit":
      await console(ns, "cron daemon quitting");
      await saveSchedule(ns);
      ns.exit();
      break;
    case "list":
      for (let j of schedule.values()) {
        await console(ns, printJob(ns, j));
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
        paused: false,
      }
      j.nextRun = Date.now()+j.when;
      var res = await ns.prompt("Create new job?\n" + printJob(ns, j));
      if (res) {
        schedule.set(j.name, j)
        await saveSchedule(ns);
        await console(ns, "New job added: %s", j.name);
      } else {
        await console(ns, "Aborted!");
      }
      break;
    case "edit":
      var name = words.shift();
      if (!schedule.has(name)) {
        await console(ns, "No job named '%s'", name);
        break;
      }
      var j = schedule.get(name);
      var invalid = [];
      while (words.length > 1) {
        var k = words.shift();
        var v;
        if (k == "args") {
          v = words.join(" ");
          words = [];
        } else {
          v = words.shift();
        }
        if (["host", "when", "jitter", "threads", "proc", "args"].indexOf(k) == -1) {
          invalid.push(k);
          continue;
        }
        j[k] = v;
      }
      if (invalid.length > 0) {
        await console(ns, "Invalid fields: %s", invalid);
      } else {
        var res = await ns.prompt("Save changes to job?\n" + printJob(ns, j));
        if (res) {
          schedule.set(j.name, j)
          await saveSchedule(ns);
          await console(ns, "Updated!");
        } else {
          await console(ns, "Aborted!");
        }
      }
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
        j.paused = false;
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
    case "restart":
      await console(ns, "Restarting cron!");
      ns.spawn(ns.getRunningScript().filename);
      break;
    default:
      await console(ns, "Unknown command: %s", cmd);
      await console(ns, "cmds: quit, list, add, edit, del, pause, resumel");
      await console(ns, "Attributes: name, host, when, jitter, threads, proc, args");
  }
}

/**
 * @param {NS} ns
 * @param {Object} j
 */
function printJob(ns, j) {
  if (!j) {
    return "Undefined job";
  }
  var now = Date.now();
  return ns.sprintf(
    "%s: on %s every %s (+-%s). Threads: %s, next: %s cmd: '%s' '%s'",
    j.name,
    j.host,
    fmt.time(j.when),
    fmt.time(j.jitter),
    j.threads,
    j.paused ? "paused" : now > j.nextRun ? "soon" : fmt.time(j.nextRun-now),
    j.proc,
    j.args,
  );

}
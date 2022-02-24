import { getPorts } from "/lib/ports.js";
import * as fmt from "/lib/fmt.js";
import { console } from "/lib/log.js";

var lastDate = new Map();
var toastHack = false;
var toastTS = 0;
var toastSum = 0;
/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    const ports = getPorts();
    var filter = loadFilter(ns);
    var ffunc = mkFilter(ns, filter);
    var date = new Date().toLocaleTimeString("en-US", { timeZone: "PST" });
    await log(ns, ffunc, "home", "logger.js", date + " - logger starting up...");
    while (true) {
        var line = ns.readPort(ports.LOGGER_CTL);
        if (!line.startsWith("NULL PORT DATA")) {
            ffunc = await ctrlFilter(ns, filter, line);
        }
        var line = ns.readPort(ports.LOGGER);
        if (line.startsWith("NULL PORT DATA")) {
            await ns.sleep(1000);
        } else {
            var data = {
                raw: line,
                host: "",
                proc: "",
                text: "",
            };
            if (line.indexOf("{") >= 0) {
                data.host = line.substring(line.indexOf("{") + 1, line.indexOf("}"));
                line = line.substr(line.indexOf("}") + 2);
            }
            if (line.indexOf("<") >= 0) {
                data.proc = line.substring(line.indexOf("<") + 1, line.indexOf(">")).replace(/^.*\//, "");
                line = line.substr(line.indexOf(">") + 2);
            }
            data.text = line;
            await log(ns, ffunc, data);
            await ns.sleep(5);
        }
    }
}

/**
 * @param {NS} ns
 * @param {function} ffunc
 * @param {object} data
 */
async function log(ns, ffunc, data) {
    // log to the central log
    if (ffunc(data)) {
        ns.print(data.raw);
    }

    // log to individual log files
    var ts = new Date().toLocaleTimeString("en-US", { timeZone: "PST" });
    var fname = "/log/log.txt";
    var msg = ts + " - " + data.text + "\n";
    if (data.host) {
        if (data.proc) {
            var proc = data.proc.split(".")[0];
            var host = data.host;
            switch (host) {
                case "I.I.I.I":
                    host = "4i";
                    break;
                case ".":
                    host = "dot";
                    break;
            }
            fname = "/log/" + host + "/" + proc + ".txt";
        } else {
            fname = "/log/" + host + "/default.txt"
        }
    }

    // toast hacks
    if (toastHack && data.proc && data.text) {
        var val = 0;
        if (data.proc.includes("worker") && data.text.includes("Hacked")) {
            // 9:00:20 AM - {neo-net} </daemons/worker.js> Hacked foodnstuff for $507,255
            val = Number(data.text.split("$")[1].replaceAll(",", ""));
        } else if (data.proc.includes("hack")) {
            // 2:47:45 AM - hack joesguns finished, got $657.08k, took 7s
            val = data.text.split(" ").filter(w => w.startsWith("$"))[0].replaceAll(/[\$,]/g, "");
            val = fmt.parseNum(val);
        }
        var sec = new Date().getSeconds();
        toastSum += val;
        if (sec != toastTS) {
            toastTS = sec;
            if (toastSum > 0) {
                ns.toast(sprintf("Hacked %s", fmt.money(toastSum)), "info", 5000);
            }
            toastSum = 0;
        }
    }

    // mark date changes
    var date = new Date().toISOString().split("T")[0];
    if (date != lastDate.get(fname)) {
        lastDate.set(fname, date);
        await ns.write(fname, "====== " + date + "\n", "a");
    }
    await ns.write(fname, msg, "a");
}

function mkFilter(ns, filter) {
    if (!filter) {
        return function (_) { return true };
    }
    var fs = [];
    var sub = function (g, w) {
        return function (d, cur) {
            return cur && g(d) && g(d).indexOf(w) == -1;
        }
    };
    var add = function (g, w) {
        return function (d, cur) {
            return cur || (g(d) && g(d).indexOf(w) >= 0);
        }
    };
    ["host", "proc", "text"].forEach((k) => {
        var g;
        switch (k) {
            case "host":
                g = function (d) { return d.host };
                break;
            case "proc":
                g = function (d) { return d.proc };
                break;
            case "text":
                g = function (d) { return d.text };
                break;
        }
        for (var w of filter.get("-" + k).keys()) {
            fs.push(sub(g, w));
        }
        for (var w of filter.get("+" + k).keys()) {
            fs.push(add(g, w));
        };
    });

    return function (d) {
        var show = true
        for (var i in fs) {
            show = fs[i](d, show);
        }
        return show;
    }
}

/**
 * @param {Map<string, string[]} filter
 * @param {string} line
 */
async function ctrlFilter(ns, filter, line) {
    // {+, -, *}{host, proc, text}{data}
    var words = line.split(" ");
    var cmd = words[0];
    var type = words[1];
    var val = words[2];
    if (["host", "proc", "text"].indexOf(type) >= 0) {
        switch (cmd) {
            case "reset":
                filter.set("-" + type, new Map());
                filter.set("+" + type, new Map());
                ns.tprint("Resetting filter");
                break;
            case "add":
                filter.get("+" + type).set(val, true);
                ns.tprint(`Updating filter: add ${type}: ${val}`);
                break;
            case "del":
                filter.get("-" + type).set(val, true);
                ns.tprint(`Updating filter: del ${type}: ${val}`);
                break;
        }
    } else if (cmd == "toast") {
        toastHack = !toastHack;
    } else if (cmd == "save") {
        await saveFilter(ns, filter);
    } else {
        await console(ns, "Unknown logger command: %s", line);
    }
    return mkFilter(ns, filter);
}

function loadFilter(ns) {
    var filter = new Map();
    filter.set("+host", new Map());
    filter.set("-host", new Map());
    filter.set("+proc", new Map());
    filter.set("-proc", new Map());
    filter.set("+text", new Map());
    filter.set("-text", new Map());
    var data = ns.read("/conf/loggingFilter.txt");
    if (data) {
        data.split("\n").forEach((l) => {
            var words = l.trim().split("\t");
            words.slice(1).forEach((w) => { filter.get(words[0]).set(w, true) });
        });
    }
    return filter;
}

/**
 * @param {NS} ns
 * @param {Map<string,Map<string,bool>>} filter
 */
async function saveFilter(ns, filter) {
    var data = [];
    for (var k of filter.keys()) {
        var words = [];
        for (var w of filter.get(k).keys()) {
            words.push(w);
        }
        data.push(ns.sprintf("%s\t%s", k, words.join("\t")));
    }
    await ns.write("/conf/loggingFilter.txt", data.join("\n"), "w");
}
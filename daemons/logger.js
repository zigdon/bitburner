import { getPorts } from "/lib/ports.js";
import * as fmt from "/lib/fmt.js";
import { console } from "/lib/log.js";

let confFile = "/conf/loggingFilter.txt";
let lastDate = {};
let toastHack = false;
let toastTS = 0;
let toastSum = 0;
/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    const ports = getPorts();
    let filter = loadFilter(ns);
    let ffunc = mkFilter(ns, filter);
    let date = new Date().toLocaleTimeString("en-US", { timeZone: "PST" });
    await log(ns, ffunc, "home", "logger.js", date + " - logger starting up...");
    while (true) {
        let line = ns.readPort(ports.LOGGER_CTL);
        if (!line.startsWith("NULL PORT DATA")) {
            ffunc = await ctrlFilter(ns, filter, line);
        }
        line = ns.readPort(ports.LOGGER);
        if (line.startsWith("NULL PORT DATA")) {
            await ns.sleep(1000);
        } else {
            let data = {
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
    let ts = new Date().toLocaleTimeString("en-US", { timeZone: "PST" });
    let fname = "/log/log.txt";
    let msg = ts + " - " + data.text + "\n";
    if (data.host) {
        if (data.proc) {
            let proc = data.proc.split(".")[0];
            let host = data.host;
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
        let val = 0;
        if (data.proc.includes("worker") && data.text.includes("Hacked")) {
            // 9:00:20 AM - {neo-net} </daemons/worker.js> Hacked foodnstuff for $507,255
            val = Number(data.text.split("$")[1].replaceAll(",", ""));
        } else if (data.proc.includes("hack")) {
            // 2:47:45 AM - hack joesguns finished, got $657.08k, took 7s
            val = data.text.split(" ").filter(w => w.startsWith("$"))[0].replaceAll(/[\$,]/g, "");
            val = fmt.parseNum(val);
        }
        let sec = new Date().getSeconds();
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
    let date = new Date().toISOString().split("T")[0];
    if (lastDate[fname] && date != lastDate[fname]) {
        lastDate[fname] = date;
        await ns.write(fname, "====== " + date + "\n", "a");
    }
    await ns.write(fname, msg, "a");
}

function mkFilter(ns, filter) {
    if (!filter) {
        return function (_) { return true };
    }
    let fs = [];
    let sub = function (g, w) {
        return function (d, cur) {
            return cur && g(d) && g(d).indexOf(w) == -1;
        }
    };
    let add = function (g, w) {
        return function (d, cur) {
            return cur || (g(d) && g(d).indexOf(w) >= 0);
        }
    };
    ["host", "proc", "text"].forEach((k) => {
        let g;
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
        for (let w of Object.keys(filter[`-${k}`])) {
            fs.push(sub(g, w));
        }
        for (let w of Object.keys(filter[`+${k}`])) {
            fs.push(add(g, w));
        };
    });

    return function (d) {
        let show = true
        for (let i in fs) {
            show = fs[i](d, show);
        }
        return show;
    }
}

/**
 * @param {object} filter
 * @param {string} line
 */
async function ctrlFilter(ns, filter, line) {
    // {+, -, *}{host, proc, text}{data}
    let words = line.split(" ");
    let cmd = words[0];
    let type = words[1];
    let val = words[2];
    if (["host", "proc", "text"].indexOf(type) >= 0) {
        switch (cmd) {
            case "reset":
                filter[`-${type}`] = {};
                filter[`+${type}`] = {};
                ns.tprint("Resetting filter");
                break;
            case "add":
                filter[`+${type}`] ||= {};
                filter[`+${type}`][val] = true;
                ns.tprint(`Updating filter: add ${type}: ${val}`);
                break;
            case "del":
                filter[`-${type}`] ||= {};
                filter[`-${type}`][val] = true;
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
    if (ns.fileExists(confFile)) {
        return JSON.parse(ns.read(confFile));
    }
    return {};
}

/**
 * @param {NS} ns
 * @param {Map<string,Map<string,bool>>} filter
 */
async function saveFilter(ns, filter) {
    await ns.write(confFile, JSON.stringify(filter), "w");
}
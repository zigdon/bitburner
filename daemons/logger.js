var lastDate = new Map();
/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    var filter = loadFilter(ns);
    var ffunc = mkFilter(ns, filter);
    var date = new Date().toLocaleTimeString("en-US", { timeZone: "PST" });
    await log(ns, ffunc, "home", "logger.js", date + " - logger starting up...");
    while(true) {
        var line = ns.readPort(7);
        if (!line.startsWith("NULL PORT DATA")) {
            ffunc = await ctrlFilter(ns, filter, line);
        }
        var line = ns.readPort(5);
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
                data.host = line.substring(line.indexOf("{")+1, line.indexOf("}"));
                line = line.substr(line.indexOf("}")+2);
            }
            if (line.indexOf("<") >= 0) {
                data.proc = line.substring(line.indexOf("<")+1, line.indexOf(">")).replace(/^.*\//, "");
                line = line.substr(line.indexOf(">")+2);
            }
            data.text = line;
            await log(ns, ffunc, data);
            await ns.sleep(5);
        }
    }
}

async function log(ns, ffunc, data) {
    if (ffunc(data)) {
        ns.print(data.raw);
    }
    var ts = new Date().toLocaleTimeString("en-US", { timeZone: "PST" });
    var fname = "/log/log.txt";
    var msg =  ts + " - " + data.text+"\n";
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
            fname = "/log/"+host+"/"+proc+".txt";
        } else {
           fname = "/log/"+host+"/default.txt"
        }
    }
    var date = new Date().toISOString().split("T")[0];
    if (date != lastDate.get(fname)) {
        lastDate.set(fname, date);
        await ns.write(fname, "====== "+date+"\n", "a");
    }
    await ns.write(fname, msg, "a");
}

function mkFilter(ns, filter) {
    if (!filter) {
        return function(_) { return true };
    }
    var fs = [];
    var sub = function(g, w) {
        return function(d, cur) {
            return cur && g(d) && g(d).indexOf(w) == -1;
        }
    };
    var add = function(g, w) {
        return function(d, cur) {
            return cur || (g(d) && g(d).indexOf(w) >= 0);
        }
    };
    ["host", "proc", "text"].forEach((k) => {
        var g;
        switch (k) {
            case "host":
                g = function(d) { return d.host };
                break;
            case "proc":
                g = function(d) { return d.proc };
                break;
            case "text":
                g = function(d) { return d.text };
                break;
        }
        for (var w of filter.get("-"+k).keys()) {
            fs.push(sub(g, w));
        }
        for (var w of filter.get("+"+k).keys()) {
            fs.push(add(g, w));
        };
    });

    return function(d) {
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
                filter.set("-"+type, new Map());
                filter.set("+"+type, new Map());
                break;
            case "add":
                filter.get("+"+type).set(val, true);
                break;
            case "del":
                filter.get("-"+type).set(val, true);
                break;
        }
    } else {
        await console(ns, "Unknown logger command: %s", line);
    }
    await saveFilter(ns, filter);
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
            words.slice(1).forEach((w) => {filter.get(words[0]).set(w, true)});
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

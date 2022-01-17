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
    var date = new Date().toLocaleTimeString("en-US", { timeZone: "PST" });
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
            await ns.write("/log/"+host+"/"+proc+".txt", date + " - " + data.text+"\n", "a");
        } else {
            await ns.write("/log/"+host+"/default.txt", date + " - " + data.text+"\n", "a");
        }
    } else {
        await ns.write("/log/log.txt", date + " - " + data.text+"\n", "a");
    }
}

function mkFilter(ns, filter) {
    if (!filter) {
        return function(_) { return true };
    }
    var fs = [];
    var sub = function(g, w) {
        return function(d, cur) {
            return cur && g(d).indexOf(w) == -1;
        }
    };
    var add = function(g, w) {
        return function(d, cur) {
            return cur || g(d).indexOf(w) >= 0;
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
        var ws = filter.get("-"+k).keys();
        for (var i in ws) {
            fs.push(sub(g, ws[i]));
        }
        ws = filter.get("+"+k).keys();
        for (var i in ws) {
            fs.push(add(g, ws[i]));
        }
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
                var cur = filter.get("+"+type);
                filter.get("+"+type).set(cur, true);
                break;
            case "del":
                var cur = filter.get("-"+type);
                filter.get("-"+type).set(cur);
                break;
        }
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
    var data = ns.read("/lib/loggingFilter.txt");
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
    for (var k in filter) {
        var words = [];
        for (var w in filter.get(k)) {
            words.push(w);
        }
        data.push(ns.sprintf("%s %s", k, words.join(" ")));
    }
    await ns.write("/lib/loggingFilter.txt", data.join("\n"), "w");
}
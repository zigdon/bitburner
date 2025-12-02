import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    var files = [];
    var args = ns.args;
    for (var i = 0; i < ns.args.length; i++) {
        var f = ns.args[i]
        if (ns.fileExists(f)) {
            files.push(f);
        } else {
            args.push(...ns.ls("home", f + "/"))
        }
    }

    ns.tprintf("merging logs: %s", files)
    var data = new Map();
    for (var f of files) {
        var name = f.substring(f.indexOf("/", 5) + 1);
        data.set(name, ns.read(f).split("\n"))
        var len = data.get(name).length;
        ns.tprintf("%s: %s lines", f, fmt.int(len))
        if (len > 50) {
            data.set(name, data.get(name).slice(-50));
        }
    }

    var fileDate = new Map();
    ns.tail();
    while (data.size > 0) {
        var next = []
        for (var f of data.keys()) {
            var line;
            var words;
            while (data.get(f).length > 0) {
                line = data.get(f)[0];
                words = line.split(" ");
                if (words[0].startsWith("=")) {
                    fileDate.set(f, words[1]);
                    data.get(f).shift();
                    continue;
                }
                if (["AM", "PM"].indexOf(words[1]) == -1) {
                    data.get(f).shift();
                    continue;
                }
                break;
            }
            if (data.get(f).length == 0) {
                continue;
            }
            var ts = words[0];
            var d = ts.split(":");
            if (words[1] == "PM" && d[0] != 12) {
                d[0] = Number(d[0]) + 12;
            } else if (words[1] == "AM" && d[0] == 12) {
                d[0] = 0;
            }
            ts = ns.sprintf("%02d:%02d:%02d", d[0], d[1], d[2]);
            next.push([fileDate.get(f), ts, f, words.splice(3).join(" ")]);
        }
        next.sort();
        if (!next[0]) {
            return;
        }
        data.get(next[0][2]).shift()
        var l = next[0];
        if (data.get(next[0][2]).length == 0) {
            data.delete(next[0][2]);
        }
        ns.print(sprintf("%s %s %s - %s", ...l));
        await ns.sleep(1);
    }

}
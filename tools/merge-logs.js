import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
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
        ns.tprintf("%s: %s lines", f, fmt.int(data.get(name).length))
    }

    var fileDate = new Map();
    while (true) {
        var date;
        var time;
        var next = []
        data.forEach((l, f) => {
            var words = l[0].split(" ");
            var ts = words[0];
            if (ts.startsWith("=")) {
                fileDate.set(f, words[1]);
            } else {
                var d = ts.split(":");
                if (words[1] == "PM" && d[0] != 12) {
                    d[0]=Number(d[0])+12;
                } else if (words[1] == "AM" && d[0] == 12) {
                    d[0] = 0;
                }
                ts = ns.sprintf("%02d:%02d:%02d", d[0], d[1], d[2]);
            }
            next.push([f, fileDate.get(f), ts, l[0]]);
        });
        ns.tprint(next);
        return;
        await ns.sleep(10);
    }

}
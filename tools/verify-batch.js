import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    let filename = ns.args[0];
    if (!filename.startsWith("/")) {
        filename = "/" + filename;
    }
    let blob = ns.read(filename);
    ns.tprint(blob.length);
    let plan = JSON.parse(blob);
    let timeline = [];
    for (let e of plan.schedule) {
        timeline.push({ts: e.ts, start: `${e.proc} #${e.batchNum}`})
        timeline.push({ts: e.ts+e.eta, end: `${e.proc} #${e.batchNum}`})
    }
    timeline.sort((a,b) => a.ts-b.ts);
    ns.tprintf(fmt.table(timeline.map(t => [t.ts, fmt.time(t.ts), t.start || "-", t.end || "-"])))
}
import * as fmt from "/lib/fmt.js";
import * as hive from "/lib/hive.js";
import {sorter} from "/lib/hosts.js";

/** @param {NS} ns **/
export async function main(ns) {
    let cmd = ns.args.shift();

    switch(cmd) {
        case "info":
            await printInfo(ns);
            break;
        case "weaken":
        case "grow":
            let [target, delta] = ns.args;
            await hive.swarmSingle(ns, cmd, target, delta);
            break;
        case "status":
            let id = ns.args.shift();
            ns.tprint(await hive.checkStatus(ns, id));
            break;
        case "bees":
            await printBees(ns);
            break;
        case "list":
            await printList(ns);
            break;
        case "batch":
            ns.tprint(await hive.batch(ns, ns.args.shift()))
            break;
        default:
            ns.tprintf("Unknown command: '%s' (info, bees, weaken, grow, status, list, batch)", cmd);
            return;
    }
}

/**
 * @param {NS} ns
 */
async function printList(ns) {
    let list = await hive.list(ns);
    if (list.length == 0) {
        ns.tprintf("No jobs listed.");
        return;
    }
    /*
    [{
        "id":87106,
        "type":"job",
        "name":"weaken/phantasy",
        "status":[["foodnstuff",true]],
        "tasks":["foodnstuff:1"]}]
    ns.tprint(list)
    */
    let data = list.map(i => [
        i.id,
        i.type,
        i.name,
        i.type == "job" ? fmt.time(Date.now() - i.startTime + i.duration) : "-",
        ...Object.values((i.tasks || i.jobs)
            .map(t => t.split(":"))
            .reduce((t,c) => {
                if (c[0].startsWith("pserv-")) {
                    t.p += Number(c[1]);
                } else if (c[0].startsWith("hacknet-node-")) {
                    t.h += Number(c[1]);
                } else {
                    t.w += Number(c[1]);
                }
                 return t;
            }, {h:0, p:0, w:0}))
        ,
    ]);
    ns.tprintf(fmt.table(data, ["id", "type", "name", "ETA", "hacknet", "pserv", "wild"]));
}

/**
 * @param {NS} ns
 */
async function printInfo(ns) {
    let info = await hive.send(ns, "query")
    let summary = {
        count: info.length,
        totalRam: 0,
        freeRam: 0,
        avgRam: [],
        cores: [],
        type: {},
    };
    for (let i of info) {
        summary.totalRam += i["maxRam"];
        summary.freeRam += i["freeRam"];
        summary.avgRam.push((i["maxRam"]-i["freeRam"])/i["maxRam"]);
        summary.cores.push(i["cores"]);
        summary.type[i.type] ||= 0;
        summary.type[i.type]++;
    }

    ns.tprint(`
        Members: ${summary.count}  Max cores: ${Math.max(...summary.cores)}
        Total RAM: ${fmt.memory(summary.totalRam)}  Free RAM: ${fmt.memory(summary.freeRam)}
        Cores: ${Object.entries(summary.cores.reduce((t, c) => {
            t[c] = t[c] ? t[c]+1 : 1;
            return t;
        }, {})).map(i => `${i[1]}x${i[0]}`)}
        Types: ${Object.entries(summary.type).map(t => t.join(": ")).join(", ")}
    `)
}

/**
 * @param {NS} ns
 */
async function printBees(ns) {
    let info = await hive.send(ns, "query");
    info = info.sort((a,b) => sorter(a.host, b.host));
    let data = info.map(i => [i.host, i.type, i.maxRam, i.freeRam, (i.maxRam-i.freeRam)/i.maxRam]);
    ns.tprintf("%s", fmt.table(data,
        ["host", "type", ["mem", fmt.memory], ["free", fmt.memory], ["util", fmt.pct]]
    ));
}
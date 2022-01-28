import * as fmt from "/lib/fmt.js";
/*
BruteSSH.exe - [OWNED] - Opens up SSH Ports.
FTPCrack.exe - [OWNED] - Opens up FTP Ports.
relaySMTP.exe - [OWNED] - Opens up SMTP Ports.
HTTPWorm.exe - 30m - Opens up HTTP Ports.
SQLInject.exe - 250m - Opens up SQL Ports.
*/

/** @param {NS} ns **/
export async function main(ns) {
    if (ns.scan("home").filter((h) => {return h=="darkweb"}).length == 0) {
        ns.tprint("Waiting to purchase TOR");
        while (!ns.purchaseTor()) {
            await ns.sleep(1000);
        }
        ns.tprint("Bought TOR");
    }
    var progs = [
        ["BruteSSH", 1.5],
        ["FTPCrack", 3],
        ["relaySMTP", 15],
        ["HTTPWorm", 30],
        ["SQLInject", 250],
    ];
    while (progs.length > 0) {
        var e = progs.shift();
        var name = e[0];
        var price = e[1];
        if (ns.fileExists(name + ".exe", "home")) {
            continue;
        }
        ns.tprintf("Waiting for %s to buy %s", fmt.money(price), name);
        while (!ns.purchaseProgram(name + ".exe")) {
            await ns.sleep(1000);
        }
        ns.tprintf("Bought %s", name);
    }
}
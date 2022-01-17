/** @param {NS} ns **/
export async function main(ns) {
    var logs = ns.ls("home", "/log/");
    for (var l in logs) {
        if(logs[l].split("/").length == 4) {
            ns.rm(logs[l], "home");
        };
    }
}
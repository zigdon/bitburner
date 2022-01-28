/** @param {NS} ns **/
export async function main(ns) {
    var path = ["", "/tools"];
    var file = ns.args[0];
    var full = "";
    while (path.length > 0) {
        ns.print([path[0], file].join("/")+".js");
        if (ns.fileExists([path[0], file].join("/")+".js")) {
            full = [path[0], file].join("/")+".js";
            break;
        }
        path.shift();
    }
    if (!full) {
        ns.tprint("File not found.");
    } else {
        if (ns.args.length > 1) {
            ns.exec(full, ns.getHostname(), 1, ns.args.splice(1));
        } else {
            ns.exec(full, ns.getHostname(), 1);
        }
    }
}
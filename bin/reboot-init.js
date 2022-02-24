/** @param {NS} ns **/
export async function main(ns) {
    var state;
    if (ns.fileExists("/conf/rebootState.txt")) {
        state = ns.read("/conf/rebootState.txt");
        ns.spawn("/tools/init.js", 1, "--batch", "--money", state);
    } else {
        ns.spawn("/tools/init.js", 1, "--batch")
    }
}
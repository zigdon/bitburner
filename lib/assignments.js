/** @param {NS} ns **/
export function readAssignments(ns) {
    var data = ns.read("/conf/assignments.txt");
    var res = [];
    if (!data) {
        return res;
    }
    data.split("\n").forEach((l) => {
        var bits = l.split("\t");
        res.push({worker: bits[0], target: bits[1], targets: bits.splice(1)});
    })

    return res;
}
/** @param {NS} ns **/
export function readAssignments(ns) {
    var data = ns.read("/conf/assignments.txt");
    var res = [];
    if (!data) {
        return res;
    }
    data.split("\n").forEach((l) => {
        var bits = l.split("\t");
        if (res.filter((a) => {return a.worker == bits[0]}).length == 0) {
            res.push({worker: bits[0], target: bits[1]});
        }
    })

    return res;
}
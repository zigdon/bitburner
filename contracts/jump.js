/** @param {NS} ns **/
export async function main(ns) {
    var data = ns.args[0].split(",");
    // 7,0,8,7,4,0,2,6,7,8,3
    ns.tprint(data);
    ns.tprint(jump(ns, data));
}

/**
 * @param {NS} ns
 * @param {int[]} data
 */
function jump(ns, data) {
    if (data[0] == 0) {
        return "";
    }
    for (var i=1; i <= data[0]; i++) {
        if (i == data.length-1) {
            return i;
        }
        var sub = jump(ns, data.slice(i));
        if (sub) {
            return i + "," + sub;
        }
    }

    return "";
}
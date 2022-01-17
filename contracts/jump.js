/** @param {NS} ns **/
export async function main(ns) {
    var data = ns.args[0].split(",");
    // 7,0,8,7,4,0,2,6,7,8,3
    ns.tprint(data);
    ns.tprint(jump(data));
}

/**
 * @param {int[]} data
 */
export function jump(data) {
    if (data[0] == 0) {
        return false;
    }
    for (var i=1; i <= data[0]; i++) {
        if (i == data.length-1) {
            return true;
        }
        var sub = jump(data.slice(i));
        if (sub) {
            return true;
        }
    }

    return false;
}
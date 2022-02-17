/** @param {NS} ns **/
export async function main(ns) {
    var data = ns.sprintf("%s", ns.args[0]);
    // 87885112

    var res = mkIPs(ns, data, 4);
    ns.tprintf("[%s]", res);
}

/**
 * @param {NS} ns
 * @param {string} digits
 * @param {int} n
 */
export function mkIPs(ns, digits, n) {
    if (digits.length > n*3) {
        return [];
    }

    var res = [];
    for (var i=0; i<3; i++) {
        if (i >= digits.length) {
            break;
        }
        var oct = digits.substr(0, i+1);
        if (oct > 255 || (oct.startsWith("0") && oct.length > 1)) {
            break;
        }
        if (n > 1) {
            var sub = mkIPs(ns, digits.substr(i+1), n-1);
            if (sub.length > 0) {
                sub.forEach((s) => {res.unshift(oct + "." + s)});
            }
        } else if (i == digits.length-1) {
            res.unshift(oct);
        }
    }

    return res;
}
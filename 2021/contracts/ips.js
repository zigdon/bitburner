/** @param {NS} ns **/
export async function main(ns) {
    var data = String(ns.args[0]);
    // 87885112
    // 0187142151

    var res = mkIPs(ns, data, 4);
    ns.tprintf("[%s]", res);
}

/**
 * @param {NS} ns
 * @param {string} digits
 * @param {int} n
 */
export function mkIPs(ns, digits, n) {
    // Too long to be n octets
    if (digits.length > n*3) {
        return [];
    }

    var res = [];
    for (var i=0; i<Math.min(3, digits.length); i++) {
        var oct = digits.substr(0, i+1);
        // Rejct octets greater than 255, or multiple digits starting with "0"
        if (oct > 255 || (oct.startsWith("0") && oct.length > 1)) {
            break;
        }
        // If we want more than just one oct, take the remainder and break those up
        if (n > 1) {
            var sub = mkIPs(ns, digits.substr(i+1), n-1);
            // Append each of the results to our current oct
            res.push(...sub.map(s => `${oct}.${s}`));
        } else if (i == digits.length-1) {
            // If we want just one oct, and we used up all the digits, it should count
            res.unshift(oct);
        }
    }

    return res;
}
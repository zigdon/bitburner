var cache = [0];

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];

    ns.tprint(getSum(target)-1);
}

/**
 * @param {number} n
 */
export function getSum(n) {
    var res = 0;

    for (var k=1; k<=n; k++) {
        res += Math.pow(-1, k+1) * get(n-k*(3*k-1)/2);
        res += Math.pow(-1, -k+1) * get(n+k*(-3*k-1)/2);
    }

    return res;
}

function get(n) {
    if (n < 0) {
        return 0;
    } else if (n <= 1) {
        return 1;
    }
    if (!cache[n]) {
        cache[n] = getSum(n);
    }
    return cache[n];
}
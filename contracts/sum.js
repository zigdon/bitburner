var cache = [0];

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];

    ns.tprint(getSum(ns, target)-1);
}

/**
 * @param {NS} ns
 * @param {number} n
 */
function getSum(ns, n) {
    var res = 0;

    for (var k=1; k<=n; k++) {
        // ns.tprintf("%s*get(%d-%d*(3*%d-1)/2)", Math.pow(-1,k+1), n, k, k);
        // ns.tprintf("%s*get(%d-      %d     )", Math.pow(-1,k+1), n, k*(3*k-1)/2);
        res += Math.pow(-1, k+1) * get(ns, n-k*(3*k-1)/2);
        res += Math.pow(-1, -k+1) * get(ns, n+k*(-3*k-1)/2);
    }

    return res;
}

function get(ns, n) {
    if (n < 0) {
        // ns.tprintf("get(%d) -> 0", n);
        return 0;
    } else if (n <= 1) {
        // ns.tprintf("get(%d) -> 1", n);
        return 1;
    }
    if (!cache[n]) {
        ns.tprintf("cache miss %d", n);
        cache[n] = getSum(ns, n);
    }
    // ns.tprintf("get(%d) -> %d", n, cache[n]);
    return cache[n];
}
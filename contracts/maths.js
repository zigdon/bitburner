/** @param {NS} ns **/
export async function main(ns) {
    var data = eval(ns.args[0]);
    if (!data) {
        ns.tprint("No data");
        return;
    }
    // ["948481", -76]
    // ["827206835052", -74]

    var digits = data[0];
    var target = data[1];

    ns.tprint(digits, " ", target);

    var opts = await maths(ns, digits);
    var res = [];
    opts.forEach((o) => {
        // ns.tprint(o);
        if (eval(o) == target) {
            res.push(o);
        }
    });
    ns.tprint(res);
}

// var cache = new Map();

/**
 * @param {NS} ns
 * @param {string} digits
 * @param {int} target
 */
async function maths(ns, digits) {
    /*
    if (cache.has(digits)) {
        ns.tprint("cache hit: ", digits);
        return cache.get(digits);
    } */
    ns.tprint(digits);
    var res = [];
    for (var i = 1; i <= digits.length; i++) {
        await ns.sleep(10);
        var n = digits.substr(0, i);

        if (i == digits.length) {
            res.push(n);
            continue;
        }

        var sub = [];
        sub = await maths(ns, digits.substr(i));
        sub.forEach((s) => {
            // s = Number(s);
            res.push(n + "+" + s);
            res.push(n + "-" + s);
            res.push(n + "*" + s);
        })
    }

    // cache.set(digits, res);

    return res;
}
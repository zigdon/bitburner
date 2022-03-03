/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    var data = eval(ns.args[0]);
    if (!data) {
        ns.tprint("No data");
        return;
    }
    // data = ["948481",-76];
    // data = ["827206835052",-74];
    // data = ["7011847149",-92] -> 117 matches;

    var digits = data[0];
    var target = data[1];

    ns.tprint(digits, " ", target);
    
    var res = await allSums(ns, digits, target);
    ns.tprint(res.length);
    ns.tprint(res);
}

/**
 * @param {NS} ns
 * @param {string} digits
 * @param {number} target
 */
export async function allSums(ns, digits, target) {
    var cache = new Map();
    var opts = await maths(ns, String(digits), cache);
    var res = [];
    opts.forEach((o) => {
        if (eval(o) == target) {
            res.push(o);
        }
    });

    return res;
}


/**
 * @param {NS} ns
 * @param {string} digits
 * @param {Map<string,strung[]} cache
 */
async function maths(ns, digits, cache) {
    await ns.sleep(1);
    var opts = [];
    if (cache.has(digits)) {
        return cache.get(digits);
    }
    for (var i = 1; i <= digits.length; i++) {
        var n = digits.substr(0, i);

        if (i == digits.length) {
            opts.push(n);
            continue;
        }

        var sub = [];
        sub = await maths(ns, digits.substr(i), cache);
        sub.forEach((s) => {
            // s = Number(s);
            opts.push(n + "+" + s);
            opts.push(n + "-" + s);
            opts.push(n + "*" + s);
        })
    }

    var res = [];
    var invalid = /[-+*]0\d/;
    res = opts.filter((o) => { return !invalid.test(o) });

    cache.set(digits, res);
    return res;
}
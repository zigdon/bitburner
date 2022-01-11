/** @param {NS} ns **/
export async function main(ns) {
    var data = eval(ns.args[0]);
    // ["948481", -76]
    var digits = data[0];
    var target = data[1];

    var opts = maths(ns, digits);
    var res = [];
    opts.forEach((o) => {
        if (eval(o) == target) { res.push(o) }
    });
    ns.tprint(res);
}

/**
 * @param {NS} ns
 * @param {string} digits
 * @param {int} target
 */
function maths(ns, digits) {
    var res = [];
    for (var i=1; i<=digits.length; i++) {
        var n = digits.substr(0, i);

        if (i == digits.length) {
            res.push(n);
            continue;
        }

        var sub = [];
        // +
        sub = maths(ns, digits.substr(i));
        sub.forEach((s) => {res.push(n+"+"+s)})

        // -
        sub = maths(ns, digits.substr(i));
        sub.forEach((s) => {res.push(n+"-"+s)})

        // *
        sub = maths(ns, digits.substr(i));
        sub.forEach((s) => {res.push(n+"*"+s)})
    }

    return res;
}
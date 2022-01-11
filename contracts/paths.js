/** @param {NS} ns **/
export async function main(ns) {
    var data = eval(ns.args[0]);
    // [9, 3]
    var w = data[0];
    var h = data[1];
    var moves = h + w;
    ns.tprint(fact(moves - 2)/fact(w-1)/fact(h-1));
}

function fact(n) {
    if (n == 0) {
        return 1;
    }
    var res = 1;
    while (n > 1) {
        res *= n--;
    }

    return res;
}
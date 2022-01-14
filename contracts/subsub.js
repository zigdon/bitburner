/** @param {NS} ns **/
export async function main(ns) {
    var input = ns.args[0];
    // -1,-4,5,7,-6,-6,10,1,-1,0,9,1,-7,9,8,2,-9,1,5,-9,-8,1,1,-4,9,10,1,-5,-10,6,-8,4,5
    // -4,-2,-9,-10,-4,-3,-7,-2,0,0,1,4,0,-4,-9,10,8,7,-8

    if (input.startsWith("[")) {
        input = input.slice(1);
    }
    if (input.endsWith("]")) {
        input = input.slice(0,input.length-1);
    }
    var data = input.split(",");

    var longest = 1;
    var sum = data[0];

    for (var s=0; s< data.length; s++) {
        var res = subsum(ns, data.slice(s));
        if (res.sum > sum) {
            longest = res.len;
            sum = res.sum;
        }
    }

    ns.tprintf("longest=%s, sum=%s", longest, sum);
}

/**
 * @param {NS} ns
 * @param {int[]} data
 */
function subsum(ns, data) {
    var res = {len:0, sum:0};
    for (var l=1; l<data.length; l++) {
        for (var s=0; s+l<=data.length; s++) {
            var sum = 0;
            var sl =  data.slice(s, s+l);
            sl.forEach((n) => {sum += 1.0*n});
            if (sum > res.sum) {
                res = {len: l, sum: sum};
            }
        }
    }
    
    return res;
}
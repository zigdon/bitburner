/** @param {NS} ns **/
export async function main(ns) {
    var data = eval(ns.args[0]);
    var intervals = [];

    ns.tprint(data);
    data.forEach(function(r) {
        intervals = findInterval(ns, intervals, r);
        intervals = mergeIntervals(ns, intervals);
    })

    var res = [];
    intervals.forEach(function(r) {
        res = findInterval(ns, res, r);
    })

    ns.tprint(res.sort((a, b) =>  a[0] - b[0]));
}

//  [[24,30],[13,14],[19,29],[16,22],[7,17],[1,11],[20,24],[10,12],[23,27],[22,27],[5,10],[18,22],[25,29],[23,29]]
//  [[1,11],[13,14],[16,22],[24,30]]

/**
 * @param {NS} ns
 * @param {int[][]} all
 * @param {int[]} i
 */
function findInterval(ns, all, i) {
    var low = i[0];
    var high = i[1];
    for (var n = 0; n < all.length; n++) {
        var cL = all[n][0];
        var cH = all[n][1];
        if (high < cL || cH < low) {
            continue;
        }
        if (cL <= low && high <= cH) {
            ns.tprintf("%s contained in %s", i, all[n]);
            return all;
        } 
        if (cL <= low && cH <= high) {
            ns.tprintf("%s extends up %s", i, all[n]);
            all[n][1] = high;
            return all;
        }
        if (low <= cL && high <= cH ) {
            ns.tprintf("%s extends down %s", i, all[n]);
            all[n][0] = low;
            return all;
        }
        if (low <= cL && cH <= high) {
            ns.tprintf("%s extends both %s", i, all[n]);
            all[n][0] = low;
            all[n][1] = high;
            return all;
        }
    }

    ns.tprintf("new interval: %s", i);
    all.unshift(i);
    return all
}

/**
 * @param {NS} ns
 * @param {int[][]} all
 */
function mergeIntervals(ns, all) {
    var l = all.length;
    for (var i=0; i<l; i++) {
        var a = all[i];
        all = all.filter((b, j) => {
            if (j <= i) {
                return true;
            }
            if (a[1] < b[0] || a[0] > b[1]) {
                return true;
            }
            ns.tprintf("merging intervals: %s and %s", a, b);
            if (b[0] < a[0]) { a[0] = b[0] }
            if (b[1] > a[1]) { a[1] = b[1] }
            ns.tprintf("-> %s", a);
            l--;
            return false;
        })
    }
    return all;
}
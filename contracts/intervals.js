/** @param {NS} ns **/
export async function main(ns) {
    var data = eval(ns.args[0]);
    ns.tprint(solveIntervals(data));
}

/**
 * @param {number[]} data
 */
export function solveIntervals(data) {
    var intervals = [];

    data.forEach(function(r) {
        intervals = findInterval(intervals, r);
        intervals = mergeIntervals(intervals);
    })

    var res = [];
    intervals.forEach(function(r) {
        res = findInterval(res, r);
    })

    return res.sort((a, b) =>  a[0] - b[0]);
}

//  [[24,30],[13,14],[19,29],[16,22],[7,17],[1,11],[20,24],[10,12],[23,27],[22,27],[5,10],[18,22],[25,29],[23,29]]
//  [[1,11],[13,14],[16,22],[24,30]]

/**
 * @param {int[][]} all
 * @param {int[]} i
 */
function findInterval(all, i) {
    var low = i[0];
    var high = i[1];
    for (var n = 0; n < all.length; n++) {
        var cL = all[n][0];
        var cH = all[n][1];
        if (high < cL || cH < low) {
            continue;
        }
        if (cL <= low && high <= cH) {
            return all;
        } 
        if (cL <= low && cH <= high) {
            all[n][1] = high;
            return all;
        }
        if (low <= cL && high <= cH ) {
            all[n][0] = low;
            return all;
        }
        if (low <= cL && cH <= high) {
            all[n][0] = low;
            all[n][1] = high;
            return all;
        }
    }

    all.unshift(i);
    return all
}

/**
 * @param {int[][]} all
 */
function mergeIntervals(all) {
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
            if (b[0] < a[0]) { a[0] = b[0] }
            if (b[1] > a[1]) { a[1] = b[1] }
            l--;
            return false;
        })
    }
    return all;
}
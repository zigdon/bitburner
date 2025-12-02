/** @param {NS} ns **/
export async function main(ns) {
    var tri = [
            [5],
           [5,1],
          [5,5,3],
         [3,7,3,9],
        [3,6,3,8,9],
       [5,1,8,7,6,7],
      [3,3,9,9,3,8,8],
     [7,9,6,1,7,3,9,3],
    [3,2,6,2,4,5,2,5,7],
   [9,8,7,6,3,1,2,5,9,7],
  [6,5,9,1,8,9,3,8,8,1,1],
    ];
    
    ns.tprint(trianglePath(tri));
}

/**
 * @param {number[][]} tri
 */
export function trianglePath(tri) {
    var path = [];
    var max = 0;
    for (var l = 0; l < tri.length; l++) {
        path.push(0);
    }

    while (true) {
        var l = tri.length - 1;
        var sum = add(tri, path);
        if (sum < max || max == 0) {
            max = sum;
        }
        path = next(tri, path);
        if (!path) {
            break
        }
    }

    return max;
}

function next(data, path) {
    var i = data.length - 1;
    // Walk up the path that went to the right
    while (i > 0 && path[i] == path[i - 1] + 1) {
        i--
    }
    // If we're at the top, we're done
    if (i == 0) {
        return false;
    }

    // move to the right
    var change = false;
    if (path[i] == path[i - 1]) {
        change = true;
        path[i]++
    }
    // Everything below this point goes left
    if (!change) {
        return false;
    }
    for (var j = i + 1; j < data.length; j++) {
        path[j] = path[j - 1];
    }
    return path;
}

function add(data, path) {
    var res = 0;
    for (var i = 0; i < data.length; i++) {
        res += 1*data[i][path[i]];
    }
    return res
}
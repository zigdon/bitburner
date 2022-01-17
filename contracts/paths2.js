/** @param {NS} ns **/
export async function main(ns) {
    var data = [
        [0,0,1],
        [0,0,0],
        [0,1,0],
    ];

    ns.tprintf("paths: %d", blockedPaths(ns, data));
}

/**
 * @param {NS} ns
 * @param {int[][]} board
 */
export function blockedPaths(ns, board) {
    var res = 0;
    if (board.length == 1 && board[0].length == 1) {
        return 1;
    }

    if (board.length > 1 && board[1][0] == 0) {
        res += blockedPaths(ns, board.slice(1));
    }

    if (board[0].length > 1 && board[0][1] == 0) {
        res += blockedPaths(ns, board.map((l) => {return l.slice(1)}));
    }

    return res;
}
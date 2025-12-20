var ops = [
  "Netburners",     // 0 hacknet
  "Slum Snakes",    // 1 crime success rate
  "The Black Hand", // 2 hacking money
  "Tetrads",        // 3 physical skills
  "Daedalus",       // 4 rep gain
  "Illuminati",     // 5 faster HGW
  // ???? hacking level
]

import { table } from "@/table.js";

/** @param {NS} ns */
export async function main(ns) {
  let flags = ns.flags([
    ["op", 4],
    ["size", 7],
  ]);
  if (flags["op"] == 0) {
    ops.forEach((o, i) => ns.tprintf("%d. %s", i+1, o));
    return;
  } else {
    ns.tprintf("Start IPvGO automation against %s", ops[flags["op"]-1]);
  }
  if (![5, 7, 9, 13].includes(flags["size"])) {
    ns.tprintf("Invalid size, pick oned of 5, 7, 9, 13");
    return;
  }

  ns.disableLog("sleep")
  const play = (board, move) => {
    let next = board.map((l) => String(l))
    let nl = next[move[0]]
    nl = nl.slice(0, move[1]) + "X" + nl.slice(move[1]+1)
    next[move[0]] = nl
    return next
  };
  // Filter out moves that would put a chain at risk.
  const avoidRisk = (board, possibleMoves) => {
    return possibleMoves.filter(
      (m) => ns.go.analysis.getLiberties()[m[0]][m[1]] == 0 ||
          ns.go.analysis.getLiberties(play(board, m))[m[0]][m[1]] > 1
    );
  };

  // Leave some spaces to make it harder to capture our pieces.
  // We don't want to run out of empty node connections!
  const getRandomMove = (board, validMoves) => {
    const moveOptions = [];
    const size = board[0].length;

    // Look through all the points on the board
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        // Make sure the point is a valid move
        const isValidMove = validMoves[x][y] === true;
        const isNotReservedSpace = x % 2 === 1 || y % 2 === 1;

        if (isValidMove && isNotReservedSpace) {
          moveOptions.push([x, y]);
        }
      }
    }

    // Choose one of the found moves at random
    const safeMoves = avoidRisk(board, moveOptions)
    const randomIndex = Math.floor(Math.random() * safeMoves.length);
    return safeMoves[randomIndex] ?? [];
  };

  const getExpandMove = (board, validMoves) => {
    /*
    * Detect expansion moves:
        For each point on the board:
            * If the empty point is a valid move, and
            * If the point is not an open space reserved to protect the network [see getRandomMove()], and
            * If a point to the north, south, east, or west is a friendly router

            Then, the move will expand an existing network
    */
    const moveOptions = [];
    const size = board[0].length;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const isValidMove = validMoves[x][y] === true;
        const n = board[x+1]?.[y] == "X" ? 1 : 0;
        const s = board[x-1]?.[y] == "X" ? 1 : 0;
        const e = board[x][y+1] == "X" ? 1 : 0;
        const w = board[x][y-1] == "X" ? 1 : 0;
        const isExpansion = n + s + e + w == 2
        const isNotReservedSpace = x % 2 === 1 || y % 2 === 1;

        if (isValidMove && isNotReservedSpace && isExpansion) {
          moveOptions.push([x, y]);
        }
      }
    }
    //
    // Choose one of the found moves at random
    const safeMoves = avoidRisk(board, moveOptions)
    if (safeMoves.length > 0) {
      ns.printf("Expansions: %j", safeMoves)
    }
    const randomIndex = Math.floor(Math.random() * safeMoves.length);
    return safeMoves[randomIndex] ?? [];
  };

  const getAttackMove = (board, validMoves) => {
    // Check the enemy chains on the board, if there are any that are at risk,
    // kill them.
    const atkOptions = [];
    const defOptions = [];
    const size = board[0].length;
    const chains = ns.go.analysis.getLiberties();
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const atRisk = chains[x][y] == 1;
        const isEnemy = board[x][y] == "O";
        const isFriend = board[x][y] == "X";

        const moveOptions = [];
        if (atRisk) {
          // Pick a valid neighbour
          ns.printf("%dx%d at risk: friend %j, foe %j", x, y, isFriend, isEnemy)
          validMoves[x][y+1] === true && moveOptions.push([x, y+1]);
          validMoves[x][y-1] === true && moveOptions.push([x, y-1]);
          validMoves[x+1]?.[y] === true && moveOptions.push([x+1, y]);
          validMoves[x-1]?.[y] === true && moveOptions.push([x-1, y]);
        }
        isEnemy && atkOptions.push(...moveOptions);
        isFriend && defOptions.push(...moveOptions);
      }
    }

    // Choose one of the found moves at random
    const safeAtkOptions = avoidRisk(board, atkOptions)
    const safeDefOptions = avoidRisk(board, defOptions)
    if (safeAtkOptions.length > 0) { ns.printf("Attack: %j", safeAtkOptions); }
    if (safeDefOptions.length > 0) { ns.printf("Defense: %j", safeDefOptions); }

    const l = safeDefOptions.length || safeAtkOptions.length
    const randomIndex = Math.floor(Math.random() * l);
    return (
      safeDefOptions.length > 0 ?
        safeDefOptions[randomIndex] :
        safeAtkOptions[randomIndex])
      ?? [];
  };

  while (true) {
    // If game is over, start a new game.
    if (ns.go.getCurrentPlayer() == "None") {
      ns.go.resetBoardState(ops[flags["op"]-1], 7)
    } else if (ns.go.getCurrentPlayer() == "White") {
      // Wait for our turn
      await ns.go.opponentNextTurn();
    }

    let result, x, y;
    let randomCnt = 1;
    do {
      const board = ns.go.getBoardState();
      const validMoves = ns.go.analysis.getValidMoves();

      const [randX, randY] = getRandomMove(board, validMoves);
      const [expX, expY] = getExpandMove(board, validMoves);
      const [atkX, atkY] = getAttackMove(board, validMoves);

      // Choose a move from our options
      // Start with a few random moves,
      // the defend
      // then attack
      // then expansion.

      if (randomCnt-- > 0) {
        x = randX;
        y = randY;
      } else {
        x = atkX ?? expX ?? randX;
        y = atkY ?? expY ?? randY;
      }

      if (x === undefined) {
        // Pass turn if no moves are found
        result = await ns.go.passTurn();
      } else {
        // Play the selected move
        result = await ns.go.makeMove(x, y);
      }

      // Log opponent's next move, once it happens
      await ns.go.opponentNextTurn();

      await ns.sleep(200);

      // Keep looping as long as the opponent is playing moves
    } while (result?.type !== "gameOver");

    /*
     * {"Netburners":{
     *   "wins":4,
     *   "losses":8,
     *   "winStreak":1,
     *   "highestWinStreak":2,
     *   "favor":0,
     *   "bonusPercent":5.144373389184587,
     *   "bonusDescription":"increased hacknet production"},
     */
    let stats = ns.go.analysis.getStats();
    let data = [];
    for (var o of ops) {
      let s = stats[o]
      if (s === undefined) { continue }
      data.push([
        o, s.wins, s.losses, s.winStreak, s.highestWinStreak, s.favor,
        ns.sprintf("%s: %.2f%%", s.bonusDescription, s.bonusPercent),
      ]);
    }
    ns.print(
      table(ns, ["Faction", "Wins", "Losses", "Streak", "Highest", "Favor", "Bonus"], data));
    await ns.sleep(5000);
  }
}

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMinigameStore } from "../../store/useMinigameStore";
import { fetchNui } from "../../utils/fetchNui";
import { motion, AnimatePresence } from "framer-motion";
import "./WireFixGame.css";

// --- Types & Constants ---

// A tile's connections define whether power can flow through its corresponding DIRS index.
// Index 0: TOP, 1: RIGHT, 2: BOTTOM, 3: LEFT
type ConnectionArray = [boolean, boolean, boolean, boolean];

interface TileDef {
  type: "STRAIGHT" | "CORNER" | "T_SHAPE" | "CROSS" | "EMPTY";
  connections: ConnectionArray; // Base unrotated connections
}

const TILE_DICTIONARY: Record<string, TileDef> = {
  STRAIGHT: { type: "STRAIGHT", connections: [false, true, false, true] }, // Horizontal
  CORNER: { type: "CORNER", connections: [true, true, false, false] }, // Top-Right angle
  T_SHAPE: { type: "T_SHAPE", connections: [true, true, false, true] }, // T-junction facing UP
  CROSS: { type: "CROSS", connections: [true, true, true, true] },
  EMPTY: { type: "EMPTY", connections: [false, false, false, false] },
};

interface GridTile {
  id: string;
  row: number;
  col: number;
  type: TileDef["type"];
  rotation: number; // 0, 1, 2, 3 (each is 90deg clockwise)
  powered: boolean;
  isStartNode: boolean;
  isEndNode: boolean;
}

// Utility to rotate connections array
const getRotatedConnections = (
  base: ConnectionArray,
  rotation: number,
): ConnectionArray => {
  const rot = rotation % 4;
  const result = [...base];
  for (let i = 0; i < rot; i++) {
    result.unshift(result.pop() as boolean);
  }
  return result as ConnectionArray;
};

// Pure BFS power propagation — runs synchronously, returns a new grid and win flag.
// This must live outside the component to avoid stale-closure issues with React
// functional state updates (which run asynchronously during the render phase).
const computePowerState = (
  currentGrid: GridTile[][],
  sRow: number,
  eRow: number,
  numRows: number,
  numCols: number,
): { newGrid: GridTile[][]; reachedEnd: boolean } => {
  const nextGrid = currentGrid.map((row) =>
    row.map((cell) => ({ ...cell, powered: false })),
  );
  const visited = new Set<string>();
  const queue: { r: number; c: number; incomingDir: number }[] = [];
  // Power enters from the left of the start row (incomingDir 3 = LEFT port)
  queue.push({ r: sRow, c: 0, incomingDir: 3 });
  let reachedEnd = false;

  while (queue.length > 0) {
    const { r, c, incomingDir } = queue.shift()!;
    if (r < 0 || r >= numRows || c < 0 || c >= numCols) continue;
    const cellId = `${r}-${c}`;
    if (visited.has(cellId)) continue;

    const cell = nextGrid[r][c];
    const def = TILE_DICTIONARY[cell.type];
    const conns = getRotatedConnections(def.connections, cell.rotation);

    if (conns[incomingDir]) {
      cell.powered = true;
      visited.add(cellId);

      // Win: reached the right edge of the end row AND exits to the right
      if (c === numCols - 1 && r === eRow && conns[1]) {
        reachedEnd = true;
      }

      // Propagate: 0=TOP→r-1 (incomingDir 2), 1=RIGHT→c+1 (incomingDir 3),
      //            2=BOTTOM→r+1 (incomingDir 0), 3=LEFT→c-1 (incomingDir 1)
      if (conns[0]) queue.push({ r: r - 1, c, incomingDir: 2 });
      if (conns[1]) queue.push({ r, c: c + 1, incomingDir: 3 });
      if (conns[2]) queue.push({ r: r + 1, c, incomingDir: 0 });
      if (conns[3]) queue.push({ r, c: c - 1, incomingDir: 1 });
    }
  }

  return { newGrid: nextGrid, reachedEnd };
};

const WireFixGame: React.FC = () => {
  const { timeLimit, sessionId, closeGame, gameParams, locale, debug } =
    useMinigameStore();
  const wireLocale = locale || {};

  // Difficulty mapping (wireCount acts as grid size)
  const cols = gameParams.wireCount ? Math.max(4, gameParams.wireCount + 1) : 5;
  const rows = Math.min(cols - 1, 5); // Example: 5x4, 6x5, 7x5
  const initialTimeLimit = useRef(
    gameParams.timeLimit || timeLimit || 45,
  ).current;

  const [timeLeft, setTimeLeft] = useState(initialTimeLimit);
  const [grid, setGrid] = useState<GridTile[][]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [startRow, setStartRow] = useState(0);
  const [endRow, setEndRow] = useState(0);

  const hasEndedRef = useRef(false);

  const successSound = useRef<HTMLAudioElement | null>(null);
  const failedSound = useRef<HTMLAudioElement | null>(null);
  const turnSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    successSound.current = new Audio("assets/success.ogg");
    failedSound.current = new Audio("assets/failed.ogg");
    turnSound.current = new Audio("assets/hover.ogg");
    return () => {
      successSound.current?.pause();
      failedSound.current?.pause();
      turnSound.current?.pause();
    };
  }, []);

  // Map Generation
  useEffect(() => {
    // 1. Initialize empty grid
    let newGrid: GridTile[][] = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ({
        id: `${r}-${c}`,
        row: r,
        col: c,
        type: "EMPTY",
        rotation: 0,
        powered: false,
        isStartNode: false,
        isEndNode: false,
      })),
    );

    // 2. Randomly pick start and end rows (ensure they differ when possible)
    const sRow = Math.floor(Math.random() * rows);
    let eRow = Math.floor(Math.random() * rows);
    if (rows > 1 && eRow === sRow) eRow = (sRow + 1) % rows;
    setStartRow(sRow);
    setEndRow(eRow);

    // 3. Generate a mandatory path to ensure it is solvable
    let currentRow = sRow;
    let currentCol = 0;

    // We force the path to move right, with random vertical detours
    const pathCoords: { r: number; c: number }[] = [
      { r: currentRow, c: currentCol },
    ];

    while (currentCol < cols - 1 || currentRow !== eRow) {
      // Decide whether to move right or vertically
      let moveDir: "RIGHT" | "VERT" = "RIGHT";
      if (currentCol === cols - 1) {
        moveDir = "VERT"; // Must move vert to reach eRow at end
      } else if (currentRow !== eRow && Math.random() > 0.5) {
        moveDir = "VERT";
      }

      if (moveDir === "RIGHT") {
        currentCol++;
      } else {
        if (currentRow < eRow) currentRow++;
        else currentRow--;
      }
      pathCoords.push({ r: currentRow, c: currentCol });
    }

    // Assign tile shapes based on path flow to guarantee a solution
    for (let i = 0; i < pathCoords.length; i++) {
      const current = pathCoords[i];
      const prev =
        i > 0 ? pathCoords[i - 1] : { r: current.r, c: current.c - 1 }; // fake prev for start
      const next =
        i < pathCoords.length - 1
          ? pathCoords[i + 1]
          : { r: current.r, c: current.c + 1 }; // fake next for end

      // Determine entry and exit directions relative to current tile
      let entryDir = -1; // 0: TOP, 1: RIGHT, 2: BOTTOM, 3: LEFT
      if (prev.r < current.r)
        entryDir = 0; // Came from top
      else if (prev.c > current.c)
        entryDir = 1; // Came from right
      else if (prev.r > current.r)
        entryDir = 2; // Came from bottom
      else if (prev.c < current.c) entryDir = 3; // Came from left

      let exitDir = -1;
      if (next.r < current.r)
        exitDir = 0; // Goes top
      else if (next.c > current.c)
        exitDir = 1; // Goes right
      else if (next.r > current.r)
        exitDir = 2; // Goes bottom
      else if (next.c < current.c) exitDir = 3; // Goes left

      let reqType: TileDef["type"] = "STRAIGHT";

      if (
        (entryDir === 1 && exitDir === 3) ||
        (entryDir === 3 && exitDir === 1) ||
        (entryDir === 0 && exitDir === 2) ||
        (entryDir === 2 && exitDir === 0)
      ) {
        reqType = "STRAIGHT";
      } else {
        reqType = "CORNER";
      }

      // Randomly upgrade some straight/corners to T-Shapes or Crosses for camouflage
      if (Math.random() > 0.7) {
        reqType = Math.random() > 0.5 ? "T_SHAPE" : "CROSS";
      }

      newGrid[current.r][current.c].type = reqType;
    }

    // 4. Fill remaining empty spots with random tiles
    const tileTypes: TileDef["type"][] = ["STRAIGHT", "CORNER", "T_SHAPE"];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (newGrid[r][c].type === "EMPTY") {
          const randomType =
            tileTypes[Math.floor(Math.random() * tileTypes.length)];
          newGrid[r][c].type = randomType;
        }
        // Scramble rotations
        newGrid[r][c].rotation = Math.floor(Math.random() * 4);
      }
    }

    // 5. Ensure the start tile connects to the left port
    const startTile = newGrid[sRow][0];
    const startDef = TILE_DICTIONARY[startTile.type];
    for (let rot = 0; rot < 4; rot++) {
      const connections = getRotatedConnections(startDef.connections, rot);
      if (connections[3]) {
        startTile.rotation = rot;
        break;
      }
    }

    // 6. Ensure the end tile has a valid rotation: must both receive power from
    //    the incoming path direction AND exit to the right (connections[1]).
    const endTile = newGrid[eRow][cols - 1];
    const endDef = TILE_DICTIONARY[endTile.type];
    const secondToLast = pathCoords[pathCoords.length - 2];
    const lastCoord   = pathCoords[pathCoords.length - 1];
    // Determine which direction power arrives into the end tile
    let endIncomingDir = 3; // default: from left
    if (secondToLast.r < lastCoord.r)      endIncomingDir = 0; // came from above
    else if (secondToLast.r > lastCoord.r) endIncomingDir = 2; // came from below
    for (let rot = 0; rot < 4; rot++) {
      const connections = getRotatedConnections(endDef.connections, rot);
      if (connections[endIncomingDir] && connections[1]) {
        endTile.rotation = rot;
        break;
      }
    }

    // 7. Compute initial power state (shows which tiles are powered at start)
    const { newGrid: poweredGrid } = computePowerState(newGrid, sRow, eRow, rows, cols);
    setGrid(poweredGrid);
  }, [rows, cols]);

  // Timer
  useEffect(() => {
    if (status !== "playing") return;
    const interval = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          handleEnd(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleEnd = useCallback((win: boolean) => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    setStatus(win ? "won" : "lost");
    if (win) {
      successSound.current?.play().catch(() => {});
    } else {
      failedSound.current?.play().catch(() => {});
    }
    fetchNui("minigameEnd", { outcome: win, sessionId });
    setTimeout(closeGame, 2500);
  }, [sessionId, closeGame]);

  const handleTileClick = (r: number, c: number) => {
    if (status !== "playing") return;

    if (turnSound.current) {
      turnSound.current.currentTime = 0;
      turnSound.current.play().catch(() => {});
    }

    // Rotate the clicked tile, then immediately compute new power state synchronously.
    // This avoids the React async state-update trap: passing a function to setGrid
    // does NOT run it synchronously, so any win-flag set inside it would be invisible
    // to code running after setGrid() returns.
    const next = grid.map((row, ri) =>
      row.map((cell, ci) => ({
        ...cell,
        rotation:
          ri === r && ci === c ? (cell.rotation + 1) % 4 : cell.rotation,
      })),
    );

    const { newGrid: poweredGrid, reachedEnd } = computePowerState(
      next,
      startRow,
      endRow,
      rows,
      cols,
    );

    setGrid(poweredGrid);

    if (reachedEnd) {
      handleEnd(true);
    }
  };

  // SVG Render helpers for tiles
  const renderTileSVG = (type: TileDef["type"], powered: boolean) => {
    const strokeColor = powered ? "#00f2ff" : "#333";
    const strokeWidth = powered ? 8 : 4;
    const glowStr = powered ? "drop-shadow(0 0 6px currentColor)" : "none";

    return (
      <svg
        viewBox="0 0 100 100"
        className="tile-svg"
        style={{ filter: glowStr, color: strokeColor }}
      >
        {/* Base background port caps */}
        <circle
          cx="50"
          cy="50"
          r="15"
          fill="#111"
          stroke="#222"
          strokeWidth="2"
        />

        {type === "STRAIGHT" && (
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {type === "CORNER" && (
          <path
            d="M 50 0 C 50 50, 50 50, 100 50"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {type === "T_SHAPE" && (
          <>
            <line
              x1="0"
              y1="50"
              x2="100"
              y2="50"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="0"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </>
        )}
        {type === "CROSS" && (
          <>
            <line
              x1="0"
              y1="50"
              x2="100"
              y2="50"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <line
              x1="50"
              y1="0"
              x2="50"
              y2="100"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </>
        )}
        <circle cx="50" cy="50" r="8" fill={powered ? "#fff" : "#222"} />
      </svg>
    );
  };

  return (
    <div className="wirefix-wrapper">
      <motion.div
        className="wirefix-laptop-frame"
        initial={{ opacity: 0, scale: 0.9, rotateX: 20, y: 50 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, rotateX: 10, y: -20 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
      >
        <img
          src="assets/laptop-frame.svg"
          alt="Laptop Frame"
          className="laptop-frame-img"
        />

        <div className="wirefix-container crt-effect">
          <div className="wirefix-header">
            <div className="header-left">
              <h2 className="panel-title">
                {wireLocale.title || "POWER GRID OVERRIDE"}
              </h2>
              <div className="status-badge">
                {status === "playing" ? "ROUTING_CURRENT..." : "SESSION_END"}
              </div>
            </div>

            <div className={`wirefix-timer ${timeLeft < 5 ? "critical" : ""}`}>
              {timeLeft}s
            </div>

            <div className="system-id" style={{ justifySelf: "end" }}>
              SYS_PWR_GRID_V1
            </div>
          </div>

          <div className="grid-play-area">
            {/* Power Generator Source */}
            <div className="side-port generator-port">
              {Array.from({ length: rows }).map((_, i) => (
                <div
                  key={`gen-${i}`}
                  className={`external-node ${startRow === i ? "active-source" : ""}`}
                >
                  <div className="node-glow" />
                </div>
              ))}
            </div>

            <div
              className="circuit-board"
              style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
              }}
            >
              {grid.map((row, rIdx) =>
                row.map((cell, cIdx) => (
                  <div
                    key={cell.id}
                    className={`circuit-tile ${cell.powered ? "powered" : ""}`}
                    onClick={() => handleTileClick(rIdx, cIdx)}
                  >
                    <motion.div
                      className="tile-rotator"
                      animate={{ rotate: cell.rotation * 90 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      {renderTileSVG(cell.type, cell.powered)}
                    </motion.div>
                  </div>
                )),
              )}
            </div>

            <div className="side-port output-port">
              {Array.from({ length: rows }).map((_, i) => (
                <div
                  key={`out-${i}`}
                  className={`external-node ${endRow === i ? "target-sink" : ""}`}
                  style={{
                    borderColor: endRow === i ? "#ffcc00" : "",
                    boxShadow:
                      endRow === i ? "0 0 15px rgba(255, 204, 0, 0.5)" : "",
                  }}
                >
                  <div
                    className="node-glow"
                    style={{ display: endRow === i ? "block" : "none" }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bottom-hud container-glass">
            <span className="hint-text blink-text">
              {wireLocale.warning ||
                "CLICK TILES TO ROTATE CIRCUITS. CONNECT SOURCE TO OUTPUT."}
            </span>
          </div>

          <AnimatePresence>
            {(status === "won" || status === "lost") && (
              <motion.div
                className="wirefix-status-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className={`wirefix-status-card ${status}`}
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                >
                  <h1>
                    {status === "won"
                      ? wireLocale.won || "POWER RESTORED"
                      : wireLocale.lost || "SHORT CIRCUIT"}
                  </h1>
                  <p>
                    {status === "won"
                      ? wireLocale.won_sub || "SYSTEM ONLINE"
                      : wireLocale.lost_sub || "CONNECTION TERMINATED"}
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      {debug && status === "playing" && (
        <div className="debug-controls">
          <button onClick={() => handleEnd(true)}>DEBUG: WIN</button>
          <button onClick={() => handleEnd(false)}>DEBUG: FAIL</button>
        </div>
      )}
    </div>
  );
};

export default WireFixGame;

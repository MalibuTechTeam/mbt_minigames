import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useMinigameStore } from "../../store/useMinigameStore";
import { fetchNui } from "../../utils/fetchNui";
import { motion, AnimatePresence } from "framer-motion";
import "./HackingGame.css";

// Interface for a grid cell
interface HackingCell {
  id: string;
  char: string;
  isTarget: boolean;
  isFound: boolean;
  row: number;
  col: number;
}

const HackingGame: React.FC = () => {
  const { timeLimit, sessionId, closeGame, gameParams, locale, debug } =
    useMinigameStore();
  const hackLocale = locale?.hacking || {};

  // Game Settings from params
  // Difficulty: totalBlocks (how many numbers to find)
  const totalBlocks = gameParams.totalBlocks || 4;
  const initialTimeLimit = useRef(
    gameParams.timeLimit || timeLimit || 30,
  ).current;

  // Constants
  const GRID_SIZE = 10;
  const CHARS = "0123456789ABCDEF";

  // State
  const [grid, setGrid] = useState<HackingCell[][]>([]);
  const [timeLeft, setTimeLeft] = useState(initialTimeLimit);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [foundBlocks, setFoundBlocks] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [activeSquare, setActiveSquare] = useState({ r: 0, c: 0 }); // Current player "cursor"

  const successSound = useRef<HTMLAudioElement | null>(null);
  const failedSound = useRef<HTMLAudioElement | null>(null);
  const hoverSound = useRef<HTMLAudioElement | null>(null);
  const errorSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    successSound.current = new Audio("assets/success.ogg");
    failedSound.current = new Audio("assets/failed.ogg");
    hoverSound.current = new Audio("assets/hover.ogg");
    errorSound.current = new Audio("assets/failed.ogg"); // Reuse failed for quick error beep
  }, []);

  const handleEnd = useCallback(
    (win: boolean) => {
      if (status !== "playing") return;
      setStatus(win ? "won" : "lost");

      if (win) {
        successSound.current?.play().catch(() => {});
      } else {
        failedSound.current?.play().catch(() => {});
      }

      fetchNui("hackingEnd", { outcome: win, sessionId });

      // Removed window.location.reload() which causes lag.
      // Use the standard closeGame after a delay to show success/fail screen.
      setTimeout(() => {
        closeGame();
      }, 2500);
    },
    [status, sessionId, closeGame],
  );

  const triggerMistake = useCallback(() => {
    if (status !== "playing") return;
    setMistakes((prev: number) => prev + 1);
    errorSound.current?.play().catch(() => {});

    // Optional: add shake effect or penalty
    if (mistakes >= 2) {
      // 3 strikes you're out
      handleEnd(false);
    }
  }, [status, mistakes, handleEnd]);

  // Initial Grid Generation
  useEffect(() => {
    const newGrid: HackingCell[][] = [];
    // 1. Fill with random junk
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: HackingCell[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push({
          id: `${r}-${c}`,
          char: CHARS[Math.floor(Math.random() * CHARS.length)],
          isTarget: false,
          isFound: false,
          row: r,
          col: c,
        });
      }
      newGrid.push(row);
    }

    // 2. Place target blocks
    let placed = 0;
    while (placed < totalBlocks) {
      const r = Math.floor(Math.random() * GRID_SIZE);
      const c = Math.floor(Math.random() * GRID_SIZE);
      if (!newGrid[r][c].isTarget) {
        newGrid[r][c].isTarget = true;
        placed++;
      }
    }

    setGrid(newGrid);
  }, [totalBlocks]);

  // Timer logic - fixed to avoid multiple intervals and race conditions
  useEffect(() => {
    if (status !== "playing") return;

    const interval = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (status !== "playing") return prev;
        if (prev <= 1) {
          handleEnd(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, handleEnd]);

  const handleCellClick = (r: number, c: number) => {
    if (status !== "playing") return;

    hoverSound.current?.play().catch(() => {});
    setActiveSquare({ r, c });

    const cell = grid[r][c];
    if (cell.isTarget && !cell.isFound) {
      const newGrid = [...grid];
      newGrid[r][c].isFound = true;
      setGrid(newGrid);

      const newCount = foundBlocks + 1;
      setFoundBlocks(newCount);

      if (newCount === totalBlocks) {
        handleEnd(true);
      }
    } else if (!cell.isTarget) {
      triggerMistake();
    }
  };

  // Keyboard Navigation
  useEffect(() => {
    if (status !== "playing") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      setActiveSquare((prev) => {
        let { r, c } = prev;
        if (e.key === "ArrowUp") r = Math.max(0, r - 1);
        else if (e.key === "ArrowDown") r = Math.min(GRID_SIZE - 1, r + 1);
        else if (e.key === "ArrowLeft") c = Math.max(0, c - 1);
        else if (e.key === "ArrowRight") c = Math.min(GRID_SIZE - 1, c + 1);
        else if (e.key === "Enter") {
          handleCellClick(r, c);
          return prev;
        } else return prev;

        return { r, c };
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, grid, foundBlocks]); // Add dependencies to avoid closures

  return (
    <div className="hacking-wrapper">
      <motion.div
        className="hacking-laptop-frame"
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -50 }}
      >
        <img
          src="assets/laptop-frame.svg"
          alt="Laptop Frame"
          className="laptop-frame-img"
        />
        <div className="hacking-container crt-effect">
          {/* Header */}
          <div className="hacking-header">
            <div className="header-left">
              <span className="system-label">
                {hackLocale.system_label || "SYSTEM OVERRIDE"}
              </span>
              <div className="header-title">
                {hackLocale.title || "DECRYPT_X-77"}
              </div>
            </div>

            <div className={`hacking-timer ${timeLeft < 5 ? "critical" : ""}`}>
              <span className="timer-label">
                {hackLocale.timer_label || "TTL"}
              </span>
              <span className="time-val">{timeLeft}s</span>
            </div>

            <div className="mistakes-tracker">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`mistake-dot ${i < mistakes ? "active" : ""}`}
                />
              ))}
            </div>
          </div>

          {/* Grid View */}
          <div className="hacking-grid">
            {grid.map((row, rIdx) => (
              <div key={rIdx} className="grid-row">
                {row.map((cell, cIdx) => (
                  <motion.div
                    key={cell.id}
                    className={`grid-cell ${cell.isFound ? "found" : ""} ${activeSquare.r === rIdx && activeSquare.c === cIdx ? "active" : ""}`}
                    onClick={() => handleCellClick(rIdx, cIdx)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {cell.char}
                  </motion.div>
                ))}
              </div>
            ))}
          </div>

          {/* Footer UI */}
          <div className="hacking-footer">
            <div className="progress-bar-container">
              <div className="progress-label">
                {hackLocale.progress || "DECRYPTION PROGRESS"}
              </div>
              <div className="progress-bar-bg">
                <motion.div
                  className="progress-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${(foundBlocks / totalBlocks) * 100}%` }}
                />
              </div>
            </div>
            <div className="status-message blink-text">
              {status === "playing"
                ? hackLocale.scanning || "SCANNING FOR VULNERABILITIES..."
                : "CONNECTION LOST"}
            </div>
          </div>

          <AnimatePresence>
            {(status === "won" || status === "lost") && (
              <motion.div
                className="hacking-status-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className={`status-card ${status}`}
                  initial={{ scale: 0.5, y: 100 }}
                  animate={{ scale: 1, y: 0 }}
                >
                  <div className="card-inner">
                    <h1>
                      {status === "won"
                        ? hackLocale.access_granted || "ACCESS GRANTED"
                        : hackLocale.access_denied || "ACCESS DENIED"}
                    </h1>
                    <div className="card-divider" />
                    <p>
                      {status === "won"
                        ? hackLocale.success_sub || "ENCRYPTION KEYS EXTRACTED"
                        : hackLocale.failed_sub ||
                          "FIREWALL COUNTER-MEASURES ACTIVE"}
                    </p>
                  </div>
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

export default HackingGame;

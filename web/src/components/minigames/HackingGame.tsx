import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useMinigameStore } from "../../store/useMinigameStore";
import type { Locale } from "../../store/useMinigameStore";
import { fetchNui } from "../../utils/fetchNui";
import { motion, AnimatePresence } from "framer-motion";
import LaptopFrame from "./LaptopFrame";
import "./HackingGame.css";

const HEX = "0123456789ABCDEF";
const genHexPair = () =>
  HEX[Math.floor(Math.random() * 16)] + HEX[Math.floor(Math.random() * 16)];
const buildGrid = () => Array.from({ length: 64 }, genHexPair);
const buildWanted = (grid: string[], length: number) =>
  Array.from({ length }, () => grid[Math.floor(Math.random() * 64)]);

const BootSequence: React.FC<{
  onComplete: () => void;
  hackingLocale: Locale;
}> = ({ onComplete, hackingLocale }) => {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const bootLines = (hackingLocale.boot_lines as string[]) || [
      "[ KERNEL ] LOADING NEURAL MODULES...",
      "[ MEMORY ] INTEG_CHECK: 0x5F3A... PASS",
      "[ NET ] BYPASSING FIREWALL (PORT 8080)...",
      "[ SEC ] DECRYPTING NODES: 0x4F2A, 0xBC12...",
      "[ SYSTEM ] INITIALIZING INTERFACE...",
      "[ READY ] SYSTEM OVERRIDE ACTIVE.",
    ];

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    let currentLine = 0;
    const addLine = () => {
      if (cancelled) return;
      if (currentLine < bootLines.length) {
        setLines((prev) => [...prev, bootLines[currentLine]]);
        currentLine++;
        timers.push(setTimeout(addLine, Math.random() * 300 + 100));
      } else {
        timers.push(setTimeout(onComplete, 800));
      }
    };

    timers.push(setTimeout(addLine, 100));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [onComplete, hackingLocale]);

  return (
    <div className="boot-sequence">
      {lines.map((line, i) => (
        <div key={i} className="boot-line">
          {line}
        </div>
      ))}
      <motion.div
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.1, repeat: Infinity }}
        className="boot-cursor"
      >
        _
      </motion.div>
    </div>
  );
};

const HackingGame: React.FC = () => {
  const { timeLimit, sessionId, closeGame, gameParams, locale, debug } =
    useMinigameStore(
      useShallow((s) => ({
        timeLimit: s.timeLimit,
        sessionId: s.sessionId,
        closeGame: s.closeGame,
        gameParams: s.gameParams,
        locale: s.locale,
        debug: s.debug,
      })),
    );
  const hackingLocale = useMemo(() => locale || {}, [locale]);
  const maxMistakes = gameParams.maxMistakes || 4;
  const sequenceLength = gameParams.sequenceLength || 5;
  const [timeLeft, setTimeLeft] = useState(timeLimit || 35);
  // Grid + target sequence are derived once from props — lazy-init, no effect.
  const [gridItems] = useState<string[]>(buildGrid);
  const [wantedItems] = useState<string[]>(() =>
    buildWanted(gridItems, sequenceLength),
  );
  const [foundItems, setFoundItems] = useState<string[]>([]);
  const [isBooting, setIsBooting] = useState(true);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [displaySessionId] = useState(() =>
    Math.random().toString(36).substring(7).toUpperCase(),
  );

  const hasEndedRef = useRef(false);

  const hoverSound = useRef<HTMLAudioElement | null>(null);
  const clickSound = useRef<HTMLAudioElement | null>(null);
  const errorSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const loseSound = useRef<HTMLAudioElement | null>(null);

  const handleEnd = useCallback(
    (success: boolean) => {
      if (hasEndedRef.current) return;
      hasEndedRef.current = true;
      setStatus(success ? "won" : "lost");
      fetchNui("minigameEnd", { outcome: success, sessionId });
      if (success) {
        winSound.current?.play().catch(() => {});
        setTimeout(closeGame, 2000);
      } else {
        loseSound.current?.play().catch(() => {});
        setTimeout(closeGame, 3000);
      }
    },
    [sessionId, closeGame],
  );

  useEffect(() => {
    hoverSound.current = new Audio("assets/hover.ogg");
    clickSound.current = new Audio("assets/success.ogg");
    errorSound.current = new Audio("assets/error.ogg");
    winSound.current = new Audio("assets/success.ogg");
    loseSound.current = new Audio("assets/failed.ogg");
    return () => {
      hoverSound.current?.pause();
      clickSound.current?.pause();
      errorSound.current?.pause();
      winSound.current?.pause();
      loseSound.current?.pause();
    };
  }, []);

  useEffect(() => {
    const bootTimer = setTimeout(() => setIsBooting(false), 2000);
    return () => clearTimeout(bootTimer);
  }, []);

  // Tick: one stable interval that lives only while actively playing.
  useEffect(() => {
    if (status !== "playing" || isBooting) return;
    const timer = setInterval(
      () => setTimeLeft((prev) => Math.max(0, prev - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [status, isBooting]);

  // End the game when the clock reaches zero.
  useEffect(() => {
    if (timeLeft === 0 && status === "playing" && !isBooting) {
      handleEnd(false);
    }
  }, [timeLeft, status, isBooting, handleEnd]);

  const handleItemClick = (item: string, index: number) => {
    if (status !== "playing" || isBooting) return;

    if (item === wantedItems[foundItems.length]) {
      if (clickSound.current) {
        clickSound.current.currentTime = 0;
        clickSound.current.play().catch(() => {});
      }
      const newFound = [...foundItems, item];
      setFoundItems(newFound);
      if (newFound.length === wantedItems.length) {
        handleEnd(true);
      }
    } else {
      if (errorSound.current) {
        errorSound.current.currentTime = 0;
        errorSound.current.play().catch(() => {});
      }
      setWrongIndex(index);

      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);

      if (newMistakes >= maxMistakes) {
        handleEnd(false);
      }

      setTimeout(() => setWrongIndex(null), 500);
    }
  };

  return (
    <LaptopFrame>
      <div className="screen-effects">
        <div className="scanlines"></div>
        <div className="screen-smudge"></div>
        <div className="crt-flicker"></div>
      </div>

      <AnimatePresence mode="wait">
        {status !== "playing" ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`result-overlay-screen ${status}`}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="result-content"
            >
              <h2 className="glitch-text">
                {status === "won"
                  ? hackingLocale.granted || "ACCESS GRANTED"
                  : hackingLocale.denied || "ACCESS DENIED"}
              </h2>
              <div className="status-line"></div>
              <p>
                {status === "won"
                  ? hackingLocale.granted_sub || "SYSTEM OVERRIDE COMPLETE"
                  : hackingLocale.denied_sub || "SECURITY PROTOCOL TRIGGERED"}
              </p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="game"
            className="game-window"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {isBooting ? (
              <BootSequence
                onComplete={() => setIsBooting(false)}
                hackingLocale={hackingLocale}
              />
            ) : (
              <>
                <div className="window-header">
                  <div className="header-left">
                    <span className="terminal-path">
                      {hackingLocale.title || "TERMINAL NODE DECRYPTION"}
                    </span>
                  </div>
                  <div className="header-right">
                    <span>user@mbt-osc ~ /session_{displaySessionId}</span>
                    <motion.span
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="cursor"
                    >
                      _
                    </motion.span>
                  </div>
                  <div
                    className="mistakes-counter"
                    style={{
                      color: mistakes >= maxMistakes - 1 ? "red" : "#fff",
                      marginLeft: "10px",
                    }}
                  >
                    ERRORS: {mistakes}/{maxMistakes}
                  </div>
                </div>

                <div className="instruction-strip">
                  {hackingLocale.instruction ||
                    "IDENTIFY SEQUENCE PATTERN IN DESIGNATED ORDER"}
                </div>

                <div className="hacking-layout">
                  <div className="grid-container">
                    {gridItems.map((item, idx) => (
                      <motion.div
                        key={idx}
                        className={`hacking-grid-item ${foundItems.includes(item) ? "selected" : ""} ${idx === wrongIndex ? "wrong" : ""}`}
                        onClick={() => handleItemClick(item, idx)}
                        onMouseEnter={() => {
                          if (hoverSound.current) {
                            hoverSound.current.currentTime = 0;
                            hoverSound.current.play().catch(() => {});
                          }
                        }}
                      >
                        {item}
                      </motion.div>
                    ))}
                  </div>

                  <div className="hacking-sidebar">
                    <div className="sidebar-title">
                      {hackingLocale.target_label || "TARGET SEQUENCE"}
                    </div>
                    <div className="wanted-sequence">
                      {wantedItems.map((item, idx) => (
                        <div
                          key={idx}
                          className={`sequence-item ${idx < foundItems.length ? "found" : idx === foundItems.length ? "active" : "pending"}`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="timer-box">{timeLeft}s</div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {debug && status === "playing" && (
        <div className="debug-controls">
          <button onClick={() => handleEnd(true)}>DEBUG: WIN</button>
          <button onClick={() => handleEnd(false)}>DEBUG: FAIL</button>
        </div>
      )}
    </LaptopFrame>
  );
};

export default HackingGame;

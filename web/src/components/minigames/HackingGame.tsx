import React, { useEffect, useState, useRef } from "react";
import { useMinigameStore } from "../../store/useMinigameStore";
import { fetchNui } from "../../utils/fetchNui";
import { motion, AnimatePresence } from "framer-motion";
import LaptopFrame from "./LaptopFrame";
import "./HackingGame.css";

const BootSequence: React.FC<{
  onComplete: () => void;
  hackingLocale: any;
}> = ({ onComplete, hackingLocale }) => {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const bootLines = hackingLocale.boot_lines || [
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
    useMinigameStore();
  const hackingLocale = locale || {};
  const [timeLeft, setTimeLeft] = useState(timeLimit || 35);
  const [gridItems, setGridItems] = useState<string[]>([]);
  const [wantedItems, setWantedItems] = useState<string[]>([]);
  const [foundItems, setFoundItems] = useState<string[]>([]);
  const [isBooting, setIsBooting] = useState(true);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const maxMistakes = gameParams.maxMistakes || 4;
  const sequenceLength = gameParams.sequenceLength || 5;
  const [displaySessionId] = useState(
    Math.random().toString(36).substring(7).toUpperCase(),
  );

  const hasEndedRef = useRef(false);

  const hoverSound = useRef<HTMLAudioElement | null>(null);
  const clickSound = useRef<HTMLAudioElement | null>(null);
  const errorSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const loseSound = useRef<HTMLAudioElement | null>(null);

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
    const hex = "0123456789ABCDEF";
    const generateHex = () =>
      Array.from({ length: 2 }, () => hex[Math.floor(Math.random() * 16)]).join(
        "",
      );
    const newGrid = Array.from({ length: 64 }, generateHex);
    const newWanted = Array.from(
      { length: sequenceLength },
      () => newGrid[Math.floor(Math.random() * 64)],
    );

    setGridItems(newGrid);
    setWantedItems(newWanted);
    setFoundItems([]);
    setTimeLeft(timeLimit || 35);

    const bootTimer = setTimeout(() => setIsBooting(false), 2000);
    return () => clearTimeout(bootTimer);
  }, [timeLimit, sequenceLength]);

  useEffect(() => {
    if (
      status === "playing" &&
      !isBooting &&
      timeLeft > 0 &&
      foundItems.length < wantedItems.length
    ) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && status === "playing") {
      handleEnd(false);
    }
  }, [status, isBooting, timeLeft, foundItems.length, wantedItems.length]);

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

  const handleEnd = (success: boolean) => {
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

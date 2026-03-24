import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMinigameStore } from "../../store/useMinigameStore";
import { fetchNui } from "../../utils/fetchNui";
import { motion, AnimatePresence } from "framer-motion";
import LaptopFrame from "./LaptopFrame";
import "./CodeMatchGame.css";

const CHARS = "ABCDEF0123456789";

interface StreamItem {
  id: string;
  code: string;
  address: string;
}

const CodeMatchGame: React.FC = () => {
  const { timeLimit, sessionId, closeGame, gameParams, locale, debug } =
    useMinigameStore();
  const codeLocale = locale?.code_match || {};

  const initialTimeLimit = useRef(timeLimit || 30).current;
  const [timeLeft, setTimeLeft] = useState(initialTimeLimit);

  const [stream, setStream] = useState<StreamItem[]>([]);
  const [targets, setTargets] = useState<StreamItem[]>([]);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);

  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [isError, setIsError] = useState(false);
  const [mistakes, setMistakes] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);
  const didInit = useRef(false);
  const globalIdCounter = useRef(0);
  const missedRef = useRef<Record<number, boolean>>({});
  const mistakesRef = useRef(0);
  const hasEndedRef = useRef(false);
  const currentTargetIndexRef = useRef(0);

  // Difficulty parameters
  const segmentCount = gameParams.segmentCount || 5;
  const maxMistakes = gameParams.maxMistakes || 3;
  const shiftSpeed = gameParams.shiftSpeed || 800; // ms

  const targetCode = targets[currentTargetIndex]?.code || "----";

  // Physics constraints
  const ITEM_HEIGHT_VH = 8;
  const START_OFFSET_VH = 40;
  const SCANNER_CENTER_VH = 20;

  const SPEED_ITEMS_PER_SEC = 1000 / shiftSpeed;
  const SPEED_VH_PER_SEC = SPEED_ITEMS_PER_SEC * ITEM_HEIGHT_VH;
  const DISTANCE_TO_SCANNER_VH =
    START_OFFSET_VH + ITEM_HEIGHT_VH / 2 - SCANNER_CENTER_VH;
  const TIME_TO_SCANNER_SEC = DISTANCE_TO_SCANNER_VH / SPEED_VH_PER_SEC;

  // Refs for audio
  const findSound = useRef<HTMLAudioElement | null>(null);
  const errorSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const loseSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    findSound.current = new Audio("assets/success.ogg");
    errorSound.current = new Audio("assets/error.ogg");
    winSound.current = new Audio("assets/success.ogg");
    loseSound.current = new Audio("assets/failed.ogg");
  }, []);

  const generateRandomCode = () => {
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return code;
  };

  const generateStreamItem = (forcedCode?: string): StreamItem => {
    globalIdCounter.current++;
    const code = forcedCode || generateRandomCode();
    const address = `0x${globalIdCounter.current.toString(16).padStart(4, "0").toUpperCase()}`;
    return {
      id: `item-${globalIdCounter.current}`,
      code,
      address,
    };
  };

  // Initialize game
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    globalIdCounter.current = 0;

    const streamSize = Math.ceil(initialTimeLimit * SPEED_ITEMS_PER_SEC) + 5;
    const newStream = Array.from({ length: streamSize }, () =>
      generateStreamItem(),
    );

    const firstTargetTime = Math.max(TIME_TO_SCANNER_SEC + 4, 5); // Give 4-5 seconds lead-in
    const lastTargetTime = Math.max(firstTargetTime + 1, initialTimeLimit - 3);
    const timeRange = lastTargetTime - firstTargetTime;
    const timeStep = segmentCount > 1 ? timeRange / (segmentCount - 1) : 0;

    const newTargets: StreamItem[] = [];
    for (let i = 0; i < segmentCount; i++) {
      const targetTime = firstTargetTime + i * timeStep;
      const targetIndex = Math.max(
        0,
        Math.floor((targetTime - TIME_TO_SCANNER_SEC) * SPEED_ITEMS_PER_SEC),
      );
      newTargets.push(newStream[targetIndex]);
    }

    setStream(newStream);
    setTargets(newTargets);
  }, [
    initialTimeLimit,
    SPEED_ITEMS_PER_SEC,
    TIME_TO_SCANNER_SEC,
    segmentCount,
  ]);

  // physics loop
  useEffect(() => {
    if (status !== "playing") return;

    if (startTimeRef.current === undefined) {
      startTimeRef.current = performance.now();
    }

    const animate = (time: DOMHighResTimeStamp) => {
      // Use performance.now() as fallback to guarantee absolute time delta
      if (startTimeRef.current === undefined) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      const currentY = START_OFFSET_VH - (elapsed / 1000) * SPEED_VH_PER_SEC;

      if (containerRef.current) {
        containerRef.current.style.transform = `translateY(${currentY}vh)`;
      }

      // Miss Detection Logic
      if (
        targets.length > 0 &&
        currentTargetIndexRef.current < targets.length
      ) {
        const currentTarget = targets[currentTargetIndexRef.current];
        const targetEl = document.getElementById(currentTarget.id);
        const scanner = document.getElementById("scanner-bracket");

        if (targetEl && scanner) {
          const scRect = scanner.getBoundingClientRect();
          const tgRect = targetEl.getBoundingClientRect();

          if (
            tgRect.bottom < scRect.top - 10 &&
            !missedRef.current[currentTargetIndexRef.current]
          ) {
            missedRef.current[currentTargetIndexRef.current] = true;
            triggerMistake();
          }
        }
      }

      reqRef.current = requestAnimationFrame(animate);
    };
    reqRef.current = requestAnimationFrame(animate);

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [status, SPEED_VH_PER_SEC, START_OFFSET_VH]);

  const handleEnd = useCallback(
    (win: boolean) => {
      if (hasEndedRef.current) return;
      hasEndedRef.current = true;
      setStatus(win ? "won" : "lost");
      if (win) {
        winSound.current?.play().catch(() => {});
      } else {
        loseSound.current?.play().catch(() => {});
      }

      fetchNui("minigameEnd", { outcome: win, sessionId });
      setTimeout(closeGame, 2500);
    },
    [sessionId, closeGame],
  );

  useEffect(() => {
    if (status !== "playing") return;
    const timer = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          handleEnd(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, handleEnd]);

  const triggerMistake = useCallback(() => {
    setIsError(true);
    if (errorSound.current) {
      errorSound.current.currentTime = 0;
      errorSound.current.play().catch(() => {});
    }

    mistakesRef.current += 1;
    const newMistakes = mistakesRef.current;
    setMistakes(newMistakes);

    if (newMistakes >= maxMistakes) {
      handleEnd(false);
    } else {
      setTimeLeft((t: number) => Math.max(0, t - 2));
      setTimeout(() => setIsError(false), 500);
      setCurrentTargetIndex((idx) => {
        const nextIdx = idx + 1;
        currentTargetIndexRef.current = nextIdx;
        return nextIdx;
      });
    }
  }, [maxMistakes, handleEnd]);

  const handleAction = useCallback(() => {
    if (status !== "playing" || targets.length === 0) return;

    const currentTarget = targets[currentTargetIndex];
    if (!currentTarget) return;

    const scanner = document.getElementById("scanner-bracket");
    const targetEl = document.getElementById(currentTarget.id);

    let hit = false;
    if (scanner && targetEl) {
      const scRect = scanner.getBoundingClientRect();
      const tgRect = targetEl.getBoundingClientRect();

      const scCenter = scRect.top + scRect.height / 2;
      const tgCenter = tgRect.top + tgRect.height / 2;
      const tolerance = scRect.height;

      if (Math.abs(scCenter - tgCenter) < tolerance) {
        hit = true;
      }
    }

    if (hit) {
      if (findSound.current) {
        findSound.current.currentTime = 0;
        findSound.current.play().catch(() => {});
      }
      if (targetEl) targetEl.classList.add("hit-success");

      const newScore = score + 1;
      setScore(newScore);

      if (newScore >= segmentCount) {
        handleEnd(true);
      } else {
        setCurrentTargetIndex((prev: number) => {
          const nextIdx = prev + 1;
          currentTargetIndexRef.current = nextIdx;
          return nextIdx;
        });
      }
    } else {
      triggerMistake();
    }
  }, [
    status,
    targets,
    currentTargetIndex,
    score,
    mistakes,
    segmentCount,
    maxMistakes,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleAction();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAction]);

  return (
    <LaptopFrame>
      <div
        className="codematch-container crt-effect"
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          padding: "2vmin",
        }}
      >
        <div
          className={`codematch-content-shaker ${isError ? "flash-error" : ""}`}
        >
          <div className="codematch-header">
            <div className="header-side header-left">
              <span>{codeLocale.title || "NEURAL LINK DECRYPTION"}</span>
            </div>
            <div className="header-middle">
              {codeLocale.sync_progress || "SYNC"}: {score}/{segmentCount}
            </div>
            <div className="header-side header-right">
              <span
                style={{
                  color: mistakes >= maxMistakes - 1 ? "#ff0066" : "inherit",
                }}
              >
                ERRORS: {mistakes}/{maxMistakes}
              </span>
              <span style={{ marginLeft: "2vmin" }}>TIME: {timeLeft}s</span>
            </div>
          </div>

          <div className="target-display">
            <span className="target-label">
              {codeLocale.locate || "IDENTIFY SEQUENCE"}
            </span>
            <span className="target-text">{targetCode}</span>
          </div>

          <div className="stream-area">
            <div id="scanner-bracket" className="scanner-bracket"></div>
            <div className="scanline-bar"></div>
            <div className="stream-column" ref={containerRef}>
              {stream.map((item) => (
                <div
                  id={item.id}
                  key={item.id}
                  className="stream-item"
                  data-code={item.code}
                >
                  <span className="memory-addr">{item.address}</span>
                  <span className="code-val">{item.code || "----"}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="action-hint">PRESS [SPACE] TO SYNC</div>
        </div>

        <AnimatePresence>
          {status !== "playing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="codematch-status-overlay"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`codematch-status-card ${status}`}
              >
                <h1>
                  {status === "won"
                    ? codeLocale.won || "SYNC COMPLETE"
                    : codeLocale.lost || "SYNC FAILED"}
                </h1>
                <div className="status-neural-bar">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5 }}
                    className="neural-fill"
                  />
                </div>
                <p
                  style={{
                    marginTop: "2vmin",
                    fontSize: "1.2vmin",
                    opacity: 0.6,
                  }}
                >
                  {status === "won"
                    ? "TERMINAL ACCESS GRANTED"
                    : "CONNECTION TERMINATED"}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {debug && status === "playing" && (
        <div className="debug-controls">
          <button onClick={() => handleEnd(true)}>DEBUG: WIN</button>
          <button onClick={() => handleEnd(false)}>DEBUG: FAIL</button>
        </div>
      )}
    </LaptopFrame>
  );
};

export default CodeMatchGame;

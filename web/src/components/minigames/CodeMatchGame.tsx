import React, { useState, useEffect, useRef } from "react";
import { useMinigameStore } from "../../store/useMinigameStore";
import { fetchNui } from "../../utils/fetchNui";
import { motion, AnimatePresence } from "framer-motion";
import "./CodeMatchGame.css";

const CHARS = "ABCDEF0123456789";
const STREAM_SIZE = 20;

const CodeMatchGame: React.FC = () => {
  const { timeLimit, sessionId, closeGame, gameParams, locale } =
    useMinigameStore();
  const codeLocale = locale?.code_match || {};
  const [timeLeft, setTimeLeft] = useState(timeLimit || 30);

  // Sync timeLeft when timeLimit from store changes
  useEffect(() => {
    if (timeLimit > 0) {
      setTimeLeft(timeLimit);
    }
  }, [timeLimit]);
  const [targetCode, setTargetCode] = useState("");
  const [stream, setStream] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [isError, setIsError] = useState(false);
  const [mistakes, setMistakes] = useState(0);

  // Difficulty parameters
  const segmentCount = gameParams.segmentCount || 5;
  const maxMistakes = gameParams.maxMistakes || 3;
  const shiftSpeed = gameParams.shiftSpeed || 800; // ms

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

  const generateCode = () => {
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return code;
  };

  // Initialize game
  useEffect(() => {
    const initialStream = Array.from({ length: STREAM_SIZE }, generateCode);
    setStream(initialStream);
    setTargetCode(initialStream[Math.floor(Math.random() * 5)]); // Target is within first 5 items
  }, []);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleEnd(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const targetCodeRef = useRef(targetCode);
  useEffect(() => {
    targetCodeRef.current = targetCode;
  }, [targetCode]);

  const handleItemClick = (code: string) => {
    if (status !== "playing") return;

    if (code === targetCode) {
      // Correct click
      if (findSound.current) {
        findSound.current.currentTime = 0;
        findSound.current.play().catch(() => {});
      }

      const newScore = score + 1;
      setScore(newScore);

      if (newScore >= segmentCount) {
        handleEnd(true);
      } else {
        const nextTarget = generateCode();
        setTargetCode(nextTarget);
        // Inject between 3 and 7 to avoid immediate appearance or too much delay
        setStream((prev) => {
          const next = [...prev];
          const randomIndex = Math.floor(Math.random() * 5) + 3;
          if (randomIndex < next.length) {
            next[randomIndex] = nextTarget;
          }
          return next;
        });
      }
    } else {
      // Wrong click
      setIsError(true);
      if (errorSound.current) {
        errorSound.current.currentTime = 0;
        errorSound.current.play().catch(() => {});
      }

      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);

      if (newMistakes >= maxMistakes) {
        handleEnd(false);
      } else {
        setTimeLeft((prev) => Math.max(0, prev - 2)); // Penalty
        setTimeout(() => setIsError(false), 500);
      }
    }
  };

  const handleEnd = (win: boolean) => {
    setStatus(win ? "won" : "lost");
    if (win) {
      winSound.current?.play().catch(() => {});
    } else {
      loseSound.current?.play().catch(() => {});
    }

    fetchNui("hackingEnd", { outcome: win, sessionId });
    setTimeout(closeGame, 2500);
  };

  return (
    <div className="codematch-wrapper">
      <motion.div
        className="codematch-laptop-frame"
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

        <div className="codematch-container crt-effect">
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
              <div className="scanline-bar"></div>
              <motion.div
                className="stream-column"
                animate={
                  status === "playing"
                    ? {
                        y: [0, -60], // Physical height of one item + gap (adjusted in CSS)
                      }
                    : {}
                }
                transition={{
                  duration: shiftSpeed / 1000,
                  ease: "linear",
                  repeat: Infinity,
                }}
                onUpdate={() => {
                  // When we reach the end of one item's movement, rotate the stream array
                  // actually doing it here is tricky. Better to keep it simple:
                  // We'll use a larger buffer and just let it scroll.
                  // Alternative: The old logic was "static" because of how unshift worked.
                }}
                onAnimationIteration={() => {
                  // Loop the array
                  setStream((prev) => {
                    const next = [...prev];
                    next.shift(); // Remove top
                    const newCode = generateCode();
                    next.push(newCode); // Add new at bottom

                    // Use Ref to avoid stale closure of targetCode
                    const currentTarget = targetCodeRef.current;

                    // Guarantee target stays in pool if missing
                    if (!next.includes(currentTarget)) {
                      // Inject it somewhere in the middle (5-10) to make it appear eventually
                      next[Math.floor(Math.random() * 5) + 6] = currentTarget;
                    }
                    return next;
                  });
                }}
              >
                {stream.map((code, idx) => (
                  <div
                    key={`${code}-${idx}`}
                    className="stream-item"
                    onMouseDown={() => handleItemClick(code)}
                  >
                    <span className="memory-addr">
                      0x{((idx + 1) * 0x4f2a).toString(16).toUpperCase()}
                    </span>
                    <span className="code-val">{code || "----"}</span>
                  </div>
                ))}
              </motion.div>
            </div>
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
      </motion.div>
    </div>
  );
};

export default CodeMatchGame;

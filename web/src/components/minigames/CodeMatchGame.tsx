import React, { useState, useEffect, useRef } from "react";
import { useMinigameStore } from "../../store/useMinigameStore";
import { fetchNui } from "../../utils/fetchNui";
import "./CodeMatchGame.css";

const CHARS = "ABCDEF0123456789";
const STREAM_SIZE = 20;

const CodeMatchGame: React.FC = () => {
  const { timeLimit, sessionId, closeGame } = useMinigameStore();
  const [timeLeft, setTimeLeft] = useState(timeLimit || 30);
  const [targetCode, setTargetCode] = useState("");
  const [stream, setStream] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");

  // Refs for audio
  const findSound = useRef(new Audio("./assets/success.ogg"));
  const errorSound = useRef(new Audio("./assets/failed.ogg"));
  const winSound = useRef(new Audio("./assets/success.ogg"));

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

  // Stream mechanics
  useEffect(() => {
    if (status !== "playing") return;

    const streamInterval = setInterval(() => {
      setStream((prev) => {
        const next = [...prev];
        next.pop(); // Remove last
        next.unshift(generateCode()); // Add new to top

        // Ensure target is present in stream occasionally if missing
        if (!next.includes(targetCode) && Math.random() > 0.7) {
          next[0] = targetCode;
        }
        return next;
      });
    }, 800); // Speed of stream

    return () => clearInterval(streamInterval);
  }, [status, targetCode]);

  const handleItemClick = (code: string) => {
    if (status !== "playing") return;

    if (code === targetCode) {
      // Correct click
      findSound.current.currentTime = 0;
      findSound.current.play().catch(() => {});

      const newScore = score + 1;
      setScore(newScore);

      if (newScore >= 5) {
        handleEnd(true);
      } else {
        setTargetCode(generateCode());
        // Force new target into stream near top
        setStream((prev) => {
          const next = [...prev];
          next[0] = targetCode; // Note: targetCode ref might be old state here, but next render fixes it?
          // Actually setTargetCode is async. checking logic:
          // Better: pick a new target from EXISTING stream or GENERATE new.
          // Let's generate new target.
          return next;
        });
      }
    } else {
      // Wrong click
      errorSound.current.currentTime = 0;
      errorSound.current.play().catch(() => {});
      setTimeLeft((prev) => Math.max(0, prev - 2)); // Penalty
    }
  };

  const handleEnd = (win: boolean) => {
    setStatus(win ? "won" : "lost");
    if (win) winSound.current.play().catch(() => {});
    else errorSound.current.play().catch(() => {});

    fetchNui("hackingEnd", { outcome: win, sessionId });
    setTimeout(closeGame, 1500);
  };

  return (
    <div
      className="codematch-wrapper"
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "90vw" /* Responsive width */,
        maxHeight: "90vh",
        aspectRatio: "1920 / 1080" /* Enforce laptop aspect ratio */,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <img
        src="assets/laptop-frame.svg"
        alt="Laptop Frame"
        className="laptop-frame-img"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
          objectFit: "contain",
        }}
      />

      <div
        className="codematch-container crt-effect"
        style={{
          transform: "none",
          position: "absolute",
          zIndex: 1,
          borderRadius: "2px",
          /* Refined coordinates closer to HackingGame reference */
          top: "8.1%",
          left: "18.3%",
          width: "63.2%",
          height: "69.5%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          padding: "2vmin",
        }}
      >
        <div className="codematch-header">
          <span>DATA STREAM SYNC</span>
          <span>TIME: {timeLeft}s</span>
        </div>

        <div className="target-display">
          <span className="target-label">LOCATE SEQUENCE</span>
          <span
            className="target-text neon-text-green"
            style={{ fontSize: "2.5rem", letterSpacing: "8px" }}
          >
            {targetCode}
          </span>
        </div>

        <div className="stream-area">
          <div className="scanline-bar"></div>
          <div className="stream-column">
            {stream.map((code, idx) => (
              <div
                key={`${code}-${idx}`}
                className="stream-item"
                onMouseDown={() => handleItemClick(code)}
              >
                {code}
              </div>
            ))}
          </div>
        </div>

        <div className="score-display">SYNC: {score}/5</div>
      </div>
    </div>
  );
};

export default CodeMatchGame;

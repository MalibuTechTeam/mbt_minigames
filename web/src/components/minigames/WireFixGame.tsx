import React, { useEffect, useState, useRef } from "react";
import { useMinigameStore } from "../../store/useMinigameStore";
import { fetchNui } from "../../utils/fetchNui";
import { motion, AnimatePresence } from "framer-motion";
import "./WireFixGame.css";

const COLORS = [
  { name: "cyan", hex: "#00f2ff" },
  { name: "pink", hex: "#ff0066" },
  { name: "green", hex: "#39ff14" },
  { name: "yellow", hex: "#ffcc00" },
  { name: "purple", hex: "#b026ff" },
  { name: "orange", hex: "#ff9100" },
];

interface WirePoint {
  id: number;
  color: string;
  side: "left" | "right";
}

const WireFixGame: React.FC = () => {
  const { timeLimit, sessionId, closeGame, gameParams, locale } =
    useMinigameStore();
  const wireLocale = locale?.wire_fix || {};
  const [timeLeft, setTimeLeft] = useState(timeLimit || 25);
  const [leftWires, setLeftWires] = useState<WirePoint[]>([]);
  const [rightWires, setRightWires] = useState<WirePoint[]>([]);
  const [connections, setConnections] = useState<{ [key: number]: number }>({});
  const [draggingWireId, setDraggingWireId] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [errorCount, setErrorCount] = useState(0);
  const [erroredNodes, setErroredNodes] = useState<{
    left: number | null;
    right: number | null;
  }>({ left: null, right: null });

  // Difficulty parameters
  const wireCount = gameParams.wireCount || 6;
  const shuffleSpeed = gameParams.shuffleSpeed || 5000;
  const maxErrors = gameParams.maxMistakes || 3;

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const rightRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const successSound = useRef<HTMLAudioElement | null>(null);
  const failedSound = useRef<HTMLAudioElement | null>(null);
  const connectSound = useRef<HTMLAudioElement | null>(null);
  const errorSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    successSound.current = new Audio("assets/success.ogg");
    failedSound.current = new Audio("assets/failed.ogg");
    connectSound.current = new Audio("assets/hover.ogg");
    errorSound.current = new Audio("assets/error.ogg");
  }, []);

  useEffect(() => {
    const baseWires = COLORS.slice(0, wireCount).map((c, i) => ({
      ...c,
      id: i,
    }));
    setLeftWires(
      [...baseWires]
        .sort(() => Math.random() - 0.5)
        .map((w) => ({ id: w.id, color: w.hex, side: "left" })),
    );
    setRightWires(
      [...baseWires]
        .sort(() => Math.random() - 0.5)
        .map((w) => ({ id: w.id, color: w.hex, side: "right" })),
    );

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleLose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Shuffling logic for right column
    const shuffleInterval = setInterval(() => {
      if (status === "playing") {
        setRightWires((prev) => [...prev].sort(() => Math.random() - 0.5));
      }
    }, shuffleSpeed);

    return () => {
      clearInterval(interval);
      clearInterval(shuffleInterval);
    };
  }, [status]);

  const handleLose = () => {
    if (status !== "playing") return;
    setStatus("lost");
    failedSound.current?.play().catch(() => {});
    fetchNui("hackingEnd", { outcome: false, sessionId });
    setTimeout(closeGame, 2500);
  };

  const handleWin = () => {
    if (status !== "playing") return;
    setStatus("won");
    successSound.current?.play().catch(() => {});
    fetchNui("hackingEnd", { outcome: true, sessionId });
    setTimeout(closeGame, 2500);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingWireId !== null && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const startDrag = (id: number) => {
    if (status !== "playing" || connections[id] !== undefined) return;
    setDraggingWireId(id);
    if (connectSound.current) {
      connectSound.current.currentTime = 0;
      connectSound.current.play().catch(() => {});
    }
  };

  const endDrag = (targetId: number, targetColor: string) => {
    if (draggingWireId !== null) {
      const sourceWire = leftWires.find((w) => w.id === draggingWireId);
      if (sourceWire) {
        if (sourceWire.color === targetColor) {
          // Successfull connection
          setConnections((prev) => {
            const newConn = { ...prev, [draggingWireId]: targetId };
            if (Object.keys(newConn).length === wireCount) handleWin();
            return newConn;
          });
          if (connectSound.current) {
            connectSound.current.currentTime = 0;
            connectSound.current.play().catch(() => {});
          }
        } else {
          // Wrong connection
          setErrorCount((prev) => {
            const next = prev + 1;
            if (next >= maxErrors) handleLose();
            return next;
          });

          // Visual Feedback - Localized Shake
          setErroredNodes({ left: draggingWireId, right: targetId });
          if (errorSound.current) {
            errorSound.current.currentTime = 0;
            errorSound.current.play().catch(() => {});
          }
          setTimeout(() => setErroredNodes({ left: null, right: null }), 500);
        }
      }
    }
    setDraggingWireId(null);
  };

  const getCoords = (side: "left" | "right", id: number) => {
    const el = side === "left" ? leftRefs.current[id] : rightRefs.current[id];
    const container = containerRef.current;
    if (el && container) {
      const rect = el.getBoundingClientRect();
      const cRect = container.getBoundingClientRect();
      const x =
        side === "left"
          ? rect.right - cRect.left - 10
          : rect.left - cRect.left + 10;
      return { x, y: rect.top - cRect.top + rect.height / 2 };
    }
    return { x: 0, y: 0 };
  };

  const isErrorActive =
    erroredNodes.left !== null || erroredNodes.right !== null;

  return (
    <div
      className="wirefix-wrapper"
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDraggingWireId(null)}
    >
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

        <div
          className={`wirefix-container crt-effect ${isErrorActive ? "glitch-shake" : ""}`}
        >
          <div className="wirefix-header">
            <div className="header-left">
              <h2 className="panel-title">
                {wireLocale.title || "NEURAL LINK RESTORATION"}
              </h2>
              <div className="status-badge">
                {status === "playing" ? "ANALYZING_NODES..." : "SESSION_END"}
              </div>
            </div>

            <div className={`wirefix-timer ${timeLeft < 5 ? "critical" : ""}`}>
              {timeLeft}s
            </div>

            <div className="error-panel" style={{ justifySelf: "end" }}>
              <span className="error-label">SIGNAL ERRORS:</span>
              <div className="error-dots">
                {Array.from({ length: maxErrors }).map((_, i) => (
                  <div
                    key={i}
                    className={`error-dot ${i < errorCount ? "active" : ""}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="wirefix-board" ref={containerRef}>
            <svg className="wire-canvas">
              {Object.entries(connections).map(([leftId, rightId]) => {
                const start = getCoords("left", parseInt(leftId));
                const end = getCoords("right", rightId);
                const color = leftWires.find(
                  (w) => w.id === parseInt(leftId),
                )?.color;
                return (
                  <motion.path
                    key={leftId}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    d={`M ${start.x} ${start.y} C ${start.x + 80} ${start.y}, ${end.x - 80} ${end.y}, ${end.x} ${end.y}`}
                    stroke={color}
                    className="wire-path active"
                  />
                );
              })}
              {draggingWireId !== null && (
                <path
                  d={`M ${getCoords("left", draggingWireId).x} ${getCoords("left", draggingWireId).y} C ${getCoords("left", draggingWireId).x + 80} ${getCoords("left", draggingWireId).y}, ${mousePos.x - 40} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
                  className="wire-path dragging"
                  stroke={leftWires.find((w) => w.id === draggingWireId)?.color}
                />
              )}
            </svg>

            <div className="wire-column">
              {leftWires.map((wire) => (
                <div
                  key={wire.id}
                  ref={(el) => {
                    leftRefs.current[wire.id] = el;
                  }}
                  className={`connector ${connections[wire.id] !== undefined ? "connected" : ""} ${erroredNodes.left === wire.id ? "node-error-shake" : ""}`}
                  style={{ color: wire.color }}
                  onMouseDown={() => startDrag(wire.id)}
                >
                  <svg className="node-svg" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="35"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray="15 10"
                    />
                    <circle cx="50" cy="50" r="15" fill="currentColor" />
                  </svg>
                </div>
              ))}
            </div>

            <div className="wire-column">
              <AnimatePresence mode="popLayout">
                {rightWires.map((wire) => (
                  <motion.div
                    key={wire.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                      mass: 1,
                    }}
                    ref={(el) => {
                      rightRefs.current[wire.id] = el;
                    }}
                    className={`connector ${Object.values(connections).includes(wire.id) ? "connected" : ""} ${erroredNodes.right === wire.id ? "node-error-shake" : ""}`}
                    style={{ color: wire.color }}
                    onMouseUp={() => endDrag(wire.id, wire.color)}
                  >
                    <svg className="node-svg" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="35"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                    </svg>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <p className="warning-text">
            {wireLocale.warning_text || "VOLTAGE CRITICAL - ALIGN NEURAL PATHS"}
          </p>

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
                      ? wireLocale.success_title || "LINK ESTABLISHED"
                      : wireLocale.fail_title || "SYSTEM CRITICAL"}
                  </h1>
                  <p>
                    {status === "won"
                      ? wireLocale.success_desc ||
                        "NEURAL CONNECTION SUCCESSFUL"
                      : wireLocale.fail_desc || "CONNECTION TERMINATED BY HOST"}
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

export default WireFixGame;

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

const SHUFFLE_INTERVAL = 5000; // ms

const WireFixGame: React.FC = () => {
  const { timeLimit, sessionId, closeGame } = useMinigameStore();
  const [timeLeft, setTimeLeft] = useState(timeLimit || 25);
  const [leftWires, setLeftWires] = useState<WirePoint[]>([]);
  const [rightWires, setRightWires] = useState<WirePoint[]>([]);
  const [connections, setConnections] = useState<{ [key: number]: number }>({});
  const [draggingWireId, setDraggingWireId] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [errorCount, setErrorCount] = useState(0);
  const [isGlitched, setIsGlitched] = useState(false);
  const maxErrors = 3;

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const rightRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const successSound = useRef(new Audio("./assets/success.ogg"));
  const failedSound = useRef(new Audio("./assets/failed.ogg"));
  const connectSound = useRef(new Audio("./assets/hover.ogg"));

  useEffect(() => {
    const baseWires = COLORS.map((c, i) => ({ ...c, id: i }));
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
    }, SHUFFLE_INTERVAL);

    return () => {
      clearInterval(interval);
      clearInterval(shuffleInterval);
    };
  }, [status]);

  const handleLose = () => {
    if (status !== "playing") return;
    setStatus("lost");
    failedSound.current.play().catch(() => {});
    fetchNui("hackingEnd", { outcome: false, sessionId });
    setTimeout(closeGame, 1000);
  };

  const handleWin = () => {
    if (status !== "playing") return;
    setStatus("won");
    successSound.current.play().catch(() => {});
    fetchNui("hackingEnd", { outcome: true, sessionId });
    setTimeout(closeGame, 1000);
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
    connectSound.current.currentTime = 0;
    connectSound.current.play().catch(() => {});
  };

  const endDrag = (targetId: number, targetColor: string) => {
    if (draggingWireId !== null) {
      const sourceWire = leftWires.find((w) => w.id === draggingWireId);
      if (sourceWire) {
        if (sourceWire.color === targetColor) {
          // Successfull connection
          setConnections((prev) => {
            const newConn = { ...prev, [draggingWireId]: targetId };
            if (Object.keys(newConn).length === COLORS.length) handleWin();
            return newConn;
          });
          connectSound.current.currentTime = 0;
          connectSound.current.play().catch(() => {});
        } else {
          // Wrong connection
          setErrorCount((prev) => {
            const next = prev + 1;
            if (next >= maxErrors) handleLose();
            return next;
          });

          // Visual Feedback
          setIsGlitched(true);
          failedSound.current.currentTime = 0;
          failedSound.current.play().catch(() => {});
          setTimeout(() => setIsGlitched(false), 300);
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

  return (
    <div
      className={`wirefix-wrapper ${isGlitched ? "glitch-shake" : ""}`}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDraggingWireId(null)}
    >
      <img
        src="assets/laptop-frame.svg"
        alt="Laptop Frame"
        className="laptop-frame-img"
      />

      <div
        className={`wirefix-container crt-effect ${status !== "playing" ? "vignette" : ""}`}
      >
        <div className="wirefix-header">
          <div className="header-left">
            <span className="wirefix-title">NEURAL LINK RESTORATION</span>
            <div className="error-panel">
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
          <span className={`wirefix-timer ${timeLeft < 5 ? "critical" : ""}`}>
            {timeLeft}s
          </span>
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
                  className="wire-path active"
                  stroke={color}
                />
              );
            })}

            {draggingWireId !== null && (
              <path
                d={`M ${getCoords("left", draggingWireId).x} ${getCoords("left", draggingWireId).y} 
                                C ${getCoords("left", draggingWireId).x + 80} ${getCoords("left", draggingWireId).y}, 
                                  ${mousePos.x - 80} ${mousePos.y}, 
                                  ${mousePos.x} ${mousePos.y}`}
                className="wire-path dragging"
                stroke={leftWires.find((w) => w.id === draggingWireId)?.color}
              />
            )}
          </svg>

          <div className="wire-column">
            {leftWires.map((wire) => (
              <motion.div
                key={wire.id}
                layout
                ref={(el) => {
                  leftRefs.current[wire.id] = el;
                }}
                className={`connector ${connections[wire.id] !== undefined ? "connected" : ""}`}
                style={{ color: wire.color }}
                onMouseDown={() => startDrag(wire.id)}
              />
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
                  className={`connector ${Object.values(connections).includes(wire.id) ? "connected" : ""}`}
                  style={{ color: wire.color }}
                  onMouseUp={() => endDrag(wire.id, wire.color)}
                />
              ))}
            </AnimatePresence>
          </div>

          <div className="warning-text">
            CAUTION: NEURAL SYNC UNSTABLE. PORTS ARE SHIFTING.
          </div>

          {/* Win/Loss Overlays */}
          <AnimatePresence>
            {status !== "playing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="game-status-overlay"
              >
                <motion.span
                  initial={{ scale: 0.5, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className={`status-text ${status}`}
                >
                  {status === "won" ? "LINK ESTABLISHED" : "NEURAL COLLAPSE"}
                </motion.span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="status-subtitle"
                >
                  {status === "won"
                    ? "SYSTEMS STABILIZED"
                    : "CONNECTION TERMINATED"}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default WireFixGame;

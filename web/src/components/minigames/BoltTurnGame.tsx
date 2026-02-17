import React, { useState, useEffect, useRef } from "react";
import { useMinigameStore } from "../../store/useMinigameStore";
import { fetchNui } from "../../utils/fetchNui";
import { motion } from "framer-motion";
import "./BoltTurnGame.css";

const MAX_HEAT = 100;
const HEAT_DECAY = 40; // per second
// const HEAT_GAIN = 15; // Unused in new logic
const OVERHEAT_PENALTY = 2000; // ms to wait if overheated

const BoltTurnGame: React.FC = () => {
  const { timeLimit, sessionId, closeGame } = useMinigameStore();
  const [timeLeft, setTimeLeft] = useState(timeLimit || 25);
  const [boltProgress, setBoltProgress] = useState([0, 0, 0]);
  const [boltHeat, setBoltHeat] = useState([0, 0, 0]);
  const [overheated, setOverheated] = useState([false, false, false]);
  const [isGlitched, setIsGlitched] = useState(false);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [activeValve, setActiveValve] = useState<number | null>(null);
  const [heatErrors, setHeatErrors] = useState(0);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const maxErrors = 3;
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const successSound = useRef(new Audio("./assets/success.ogg"));
  const failedSound = useRef(new Audio("./assets/failed.ogg"));
  const turnSound = useRef(new Audio("./assets/hover.ogg"));

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleLose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const heatInterval = setInterval(() => {
      setBoltHeat((prev) => prev.map((h) => Math.max(0, h - HEAT_DECAY / 10)));
    }, 100);

    return () => {
      clearInterval(timerInterval);
      clearInterval(heatInterval);
    };
  }, []);

  const handleLose = () => {
    if (status !== "playing") return;
    setStatus("lost");
    failedSound.current.play().catch(() => {});
    fetchNui("hackingEnd", { outcome: false, sessionId });
    setTimeout(closeGame, 1500);
  };

  const handleWin = () => {
    if (status !== "playing") return;
    setStatus("won");
    successSound.current.play().catch(() => {});
    fetchNui("hackingEnd", { outcome: true, sessionId });
    setTimeout(closeGame, 1500);
  };

  const startTurning = (index: number) => {
    if (status !== "playing" || overheated[index] || boltProgress[index] >= 100)
      return;
    setActiveValve(index);

    turnSound.current.currentTime = 0;
    turnSound.current.loop = true;
    turnSound.current.play().catch(() => {});
  };

  const stopTurning = () => {
    setActiveValve(null);
    turnSound.current.pause();
    turnSound.current.currentTime = 0;
  };

  useEffect(() => {
    if (activeValve !== null) {
      holdInterval.current = setInterval(() => {
        if (overheated[activeValve] || boltProgress[activeValve] >= 100) {
          stopTurning();
          return;
        }

        setBoltHeat((prev) => {
          const nextHeat = [...prev];
          nextHeat[activeValve] += 3.5; // Stronger heat gain than decay

          if (nextHeat[activeValve] >= MAX_HEAT) {
            const nextOverheated = [...overheated];
            nextOverheated[activeValve] = true;
            setOverheated(nextOverheated);
            stopTurning();

            setHeatErrors((prev) => {
              const next = prev + 1;
              if (next >= maxErrors) {
                handleLose();
              }
              return next;
            });

            setErrorLog((prev) => [
              `CRITICAL OVERHEAT: VALVE #${activeValve + 1} SHUTDOWN`,
              ...prev.slice(0, 4),
            ]);

            // Visual & Audio Feedback
            setIsGlitched(true);
            setTimeout(() => setIsGlitched(false), 500);

            const steamSound = new Audio("./assets/error.ogg");
            steamSound.play().catch(() => {});

            setTimeout(() => {
              if (status !== "playing") return;
              setOverheated((prevOH) => {
                const restored = [...prevOH];
                restored[activeValve] = false;
                return restored;
              });
              setErrorLog((prev) => [
                `SYSTEM RESTORED: VALVE #${activeValve + 1} ONLINE`,
                ...prev.slice(0, 4),
              ]);
            }, OVERHEAT_PENALTY);
          }
          return nextHeat;
        });

        if (!overheated[activeValve]) {
          setBoltProgress((prev) => {
            const next = [...prev];
            next[activeValve] = Math.min(100, next[activeValve] + 0.85); // Faster progress
            if (next.every((p) => p >= 100)) handleWin();
            return next;
          });
        }
      }, 50); // Fast tick
    } else {
      if (holdInterval.current) clearInterval(holdInterval.current);
    }

    return () => {
      if (holdInterval.current) clearInterval(holdInterval.current);
    };
  }, [activeValve, overheated, boltProgress, status]); // Added dependencies

  return (
    <div
      className={`boltturn-wrapper ${isGlitched ? "glitch-shake" : ""}`}
      onMouseUp={stopTurning}
    >
      <img
        src="assets/laptop-frame.svg"
        alt="Laptop Frame"
        className="laptop-frame-img"
      />

      <div
        className={`boltturn-container crt-effect ${status !== "playing" ? "vignette" : ""}`}
      >
        <div className="boltturn-header">
          <div className="header-left">
            <span className="boltturn-title">PRESSURE CONTROL SYSTEM</span>
            <div className="system-status">
              <span className="status-label">VALVES STATE:</span>
              <div className="status-bars">
                {boltProgress.map((p, i) => (
                  <div key={i} className="mini-bar">
                    <div className="mini-progress" style={{ width: `${p}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <span className={`boltturn-timer ${timeLeft < 5 ? "critical" : ""}`}>
            {timeLeft}s
          </span>
          <div className="error-dots">
            {[...Array(maxErrors)].map((_, i) => (
              <div
                key={i}
                className={`error-dot ${i < heatErrors ? "filled" : ""}`}
              />
            ))}
          </div>
        </div>

        <div className="main-layout">
          <div className="side-indicators container-glass">
            <div className="indicator-group">
              <span className="group-label">NEURAL LOAD</span>
              <div className="stress-meter">
                <div
                  className="stress-fill"
                  style={{
                    height: `${boltHeat.reduce((a, b) => a + b, 0) / 3}%`,
                    backgroundColor: boltHeat.some((h) => h > 80)
                      ? "#ff3366"
                      : "#ff9d00",
                  }}
                />
              </div>
            </div>

            <div className="indicator-group">
              <span className="group-label">SIGNAL</span>
              <div className="stability-value">
                {Math.max(0, 100 - heatErrors * 33)}%
              </div>
              <span className="tiny-label">STABILITY</span>
            </div>
          </div>

          <div className="bolts-area">
            {boltProgress.map((prog, idx) => (
              <div
                key={idx}
                className={`bolt-wrapper ${prog >= 100 ? "bolt-done" : ""} ${overheated[idx] ? "overheated" : ""} ${boltHeat[idx] > 60 ? "heating" : ""} ${boltHeat[idx] > 85 ? "critical" : ""}`}
              >
                <div className="valve-hud">
                  <svg
                    viewBox="0 0 100 100"
                    style={{ transform: "rotate(-90deg)" }}
                  >
                    <circle cx="50" cy="50" r="45" className="hud-ring" />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      className="hud-progress"
                      strokeDasharray="283"
                      strokeDashoffset={283 - (283 * prog) / 100}
                    />
                  </svg>
                </div>

                <motion.div
                  className="bolt-svg-container"
                  onMouseDown={() => startTurning(idx)}
                  onMouseUp={stopTurning}
                  onMouseLeave={stopTurning}
                  animate={{
                    rotate: prog * 5,
                    scale: activeValve === idx ? 0.95 : 1,
                  }}
                >
                  <svg className="valve-knob" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="#222"
                      stroke="#444"
                      strokeWidth="4"
                    />
                    <rect
                      x="45"
                      y="10"
                      width="10"
                      height="30"
                      fill="#555"
                      rx="2"
                    />
                    <rect
                      x="45"
                      y="60"
                      width="10"
                      height="30"
                      fill="#555"
                      rx="2"
                    />
                    <rect
                      x="10"
                      y="45"
                      width="30"
                      height="10"
                      fill="#555"
                      rx="2"
                    />
                    <rect
                      x="60"
                      y="45"
                      width="30"
                      height="10"
                      fill="#555"
                      rx="2"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="15"
                      fill={overheated[idx] ? "#500" : "#111"}
                      stroke={overheated[idx] ? "red" : "#333"}
                      strokeWidth="2"
                      style={{ transition: "all 0.3s" }}
                    />
                    {boltHeat[idx] > 50 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill={`rgba(255, 0, 0, ${boltHeat[idx] / 200})`}
                        style={{ pointerEvents: "none" }}
                      />
                    )}
                  </svg>
                </motion.div>

                <div className="status-indicators">
                  <div className="label-small">
                    <span>VALVE #{idx + 1}</span>
                    <span
                      style={{
                        color: prog >= 100 ? "var(--neon-green)" : "#888",
                      }}
                    >
                      {prog >= 100 ? "OPTIMAL" : "ADJUST"}
                    </span>
                  </div>
                  <div className="heat-warning">
                    {overheated[idx]
                      ? "CRITICAL TEMP!"
                      : boltHeat[idx] > 70
                        ? "WARNING: HEAT"
                        : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bottom-hud">
          <div className="error-log container-glass">
            <div className="log-header">ERROR_LOG_INTERNAL</div>
            {errorLog.length === 0 ? (
              <div className="log-entry empty">NO ERRORS DETECTED</div>
            ) : (
              errorLog.map((log, i) => (
                <div key={i} className="log-entry">
                  {`> ${log}`}
                </div>
              ))
            )}
          </div>

          <div className="system-info container-glass">
            <div>MECHANICAL_REPAIR_KIT_V2.0</div>
            <div style={{ color: "rgba(255,255,255,0.2)" }}>
              ID: {sessionId?.substring(0, 8)}...
            </div>
            <div className="blink-text">
              {status === "playing" ? "ANALYZING_SYSTEM..." : "SESSION_END"}
            </div>
          </div>
        </div>

        {status !== "playing" && (
          <div className="status-overlay">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`status-card ${status}`}
            >
              <h1>
                {status === "won" ? "SYSTEM RESTORED" : "MECHANICAL FAILURE"}
              </h1>
              <p>
                {status === "won"
                  ? "Pressure stabilized at 101.3 kPa"
                  : heatErrors >= maxErrors
                    ? "CRITICAL ENGINE MELTDOWN"
                    : "TIME EXPIRED"}
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoltTurnGame;

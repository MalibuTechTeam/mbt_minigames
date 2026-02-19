import React, { useState, useEffect, useRef } from "react";
import { useMinigameStore } from "../../store/useMinigameStore";
import { fetchNui } from "../../utils/fetchNui";
import { motion, AnimatePresence } from "framer-motion";
import "./BoltTurnGame.css";

const MAX_HEAT = 100;
const HEAT_DECAY = 40; // per second
// const HEAT_GAIN = 15; // Unused in new logic
const OVERHEAT_PENALTY = 2000; // ms to wait if overheated

const CurvedGauge: React.FC<{ value: number; label: string }> = ({
  value,
  label,
}) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="gauge-container">
      <svg className="gauge-svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} className="gauge-bg" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="gauge-fill"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ stroke: value > 80 ? "#ff3366" : "#ff9d00" }}
        />
      </svg>
      <div
        className="indicator-group"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <span
          className="stability-value"
          style={{ color: value > 80 ? "#ff3366" : "#ff9d00" }}
        >
          {Math.round(value)}%
        </span>
        <span className="group-label">{label}</span>
      </div>
    </div>
  );
};

const BoltTurnGame: React.FC = () => {
  const { timeLimit, sessionId, closeGame, gameParams, locale } =
    useMinigameStore();
  const boltLocale = locale?.bolt_turn || {};
  const [timeLeft, setTimeLeft] = useState(timeLimit || 25);

  // Difficulty parameters
  const boltCount = gameParams.boltCount || 3;
  const heatSpeed = gameParams.heatSpeed || 1.0;
  const maxErrors = gameParams.maxMistakes || 3;

  const [boltProgress, setBoltProgress] = useState(
    new Array(boltCount).fill(0),
  );
  const [boltHeat, setBoltHeat] = useState(new Array(boltCount).fill(0));
  const [overheated, setOverheated] = useState(
    new Array(boltCount).fill(false),
  );
  const [glitchedValves, setGlitchedValves] = useState(
    new Array(boltCount).fill(false),
  );
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [activeValve, setActiveValve] = useState<number | null>(null);
  const [heatErrors, setHeatErrors] = useState(0);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const successSound = useRef<HTMLAudioElement | null>(null);
  const failedSound = useRef<HTMLAudioElement | null>(null);
  const turnSound = useRef<HTMLAudioElement | null>(null);
  const errorSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    successSound.current = new Audio("assets/success.ogg");
    failedSound.current = new Audio("assets/failed.ogg");
    turnSound.current = new Audio("assets/hover.ogg");
    errorSound.current = new Audio("assets/error.ogg");
  }, []);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (status !== "playing") return;
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

  const startTurning = (index: number) => {
    if (status !== "playing" || overheated[index] || boltProgress[index] >= 100)
      return;
    setActiveValve(index);

    if (turnSound.current) {
      turnSound.current.currentTime = 0;
      turnSound.current.loop = true;
      turnSound.current.play().catch(() => {});
    }
  };

  const stopTurning = () => {
    setActiveValve(null);
    if (turnSound.current) {
      turnSound.current.pause();
      turnSound.current.currentTime = 0;
    }
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
          nextHeat[activeValve] += 3.5 * heatSpeed; // Applied heat speed

          if (nextHeat[activeValve] >= MAX_HEAT) {
            const nextOverheated = [...overheated];
            nextOverheated[activeValve] = true;
            setOverheated(nextOverheated);
            stopTurning();

            setHeatErrors((prevMistakes) => {
              const next = prevMistakes + 1;
              if (next >= maxErrors) {
                handleLose();
              }
              return next;
            });

            setErrorLog((prevLogs) => [
              (
                boltLocale.log_overheat ||
                "CRITICAL OVERHEAT: VALVE #%s SHUTDOWN"
              ).replace("%s", (activeValve + 1).toString()),
              ...prevLogs.slice(0, 4),
            ]);

            // Local Visual & Audio Feedback
            setGlitchedValves((prev) => {
              const next = [...prev];
              next[activeValve] = true;
              return next;
            });
            setTimeout(() => {
              setGlitchedValves((prev) => {
                const next = [...prev];
                next[activeValve] = false;
                return next;
              });
            }, 500);

            if (errorSound.current) {
              errorSound.current.currentTime = 0;
              errorSound.current.play().catch(() => {});
            }

            setTimeout(() => {
              if (status !== "playing") return;
              setOverheated((prevOH) => {
                const restored = [...prevOH];
                restored[activeValve] = false;
                return restored;
              });
              setErrorLog((prevLogs) => [
                (
                  boltLocale.log_restored || "SYSTEM RESTORED: VALVE #%s ONLINE"
                ).replace("%s", (activeValve + 1).toString()),
                ...prevLogs.slice(0, 4),
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

  const averageHeat = boltHeat.reduce((a, b) => a + b, 0) / boltCount;

  return (
    <div className="boltturn-wrapper" onMouseUp={stopTurning}>
      <motion.div
        className="boltturn-laptop-frame"
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

        <div className="boltturn-container crt-effect">
          <div className="boltturn-header">
            <div className="header-left">
              <span className="boltturn-title">
                {boltLocale.title || "PRESSURE CONTROL SYSTEM"}
              </span>
              <div className="system-status">
                <span className="status-label">
                  {boltLocale.valves_label || "VALVES STATE"}:
                </span>
                <div className="status-bars">
                  {boltProgress.map((p, i) => (
                    <div key={i} className="mini-bar">
                      <div
                        className="mini-progress"
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="timer-box">
              <div
                className={`boltturn-timer ${timeLeft < 5 ? "critical" : ""}`}
              >
                {timeLeft}s
              </div>
            </div>

            <div className="system-id">SYSTEM_ID: MBT_BT_88</div>
          </div>

          <div className="main-layout">
            <div className="side-indicators container-glass">
              <CurvedGauge
                value={averageHeat}
                label={boltLocale.neural_load || "NEURAL LOAD"}
              />

              <div className="indicator-group" style={{ marginTop: "2vmin" }}>
                <span className="stability-value">
                  {Math.max(0, 100 - heatErrors * 33)}%
                </span>
                <span className="group-label">
                  {boltLocale.stability || "STABILITY"}
                </span>
              </div>
            </div>

            <div className="bolts-area">
              {boltProgress.map((prog, idx) => (
                <div
                  key={idx}
                  className={`bolt-wrapper ${prog >= 100 ? "bolt-done" : ""} ${overheated[idx] ? "overheated" : ""} ${boltHeat[idx] > 60 ? "heating" : ""} ${boltHeat[idx] > 85 ? "critical" : ""} ${glitchedValves[idx] ? "card-glitch" : ""}`}
                >
                  <div className="valve-label-top">
                    <span className="valve-id">VALVE #{idx + 1}</span>
                    <span className="valve-action">ADJUST</span>
                  </div>
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
                      <defs>
                        <radialGradient
                          id="knobGradient"
                          cx="50%"
                          cy="50%"
                          r="50%"
                        >
                          <stop offset="0%" stopColor="#333" />
                          <stop offset="100%" stopColor="#111" />
                        </radialGradient>
                      </defs>
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="url(#knobGradient)"
                        stroke="#444"
                        strokeWidth="2"
                      />
                      <path
                        d="M 50 15 L 50 85 M 15 50 L 85 50"
                        stroke="#222"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="12"
                        fill="#222"
                        stroke="#ff9d00"
                        strokeWidth="1"
                        style={{
                          opacity: activeValve === idx ? 1 : 0.4,
                          transition: "opacity 0.2s",
                        }}
                      />
                      <path
                        d="M 50 42 L 50 58 M 42 50 L 58 50"
                        stroke="#ff9d00"
                        strokeWidth="2"
                        style={{
                          opacity: activeValve === idx ? 1 : 0.4,
                        }}
                      />
                    </svg>
                  </motion.div>

                  <div className="status-indicators">
                    <div className="label-small">
                      <span>{boltLocale.heat_label || "HEAT"}</span>
                      <span>{Math.floor(boltHeat[idx])}%</span>
                    </div>
                    <div className="meter-bar">
                      <div
                        className="meter-fill"
                        style={{
                          width: `${boltHeat[idx]}%`,
                          background:
                            boltHeat[idx] > 85
                              ? "#ff0044"
                              : boltHeat[idx] > 60
                                ? "#ff9d00"
                                : "#00f2ff",
                          boxShadow: `0 0 10px ${boltHeat[idx] > 85 ? "#ff0044" : "#ff9d00"}`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="side-indicators-right container-glass">
                <span className="group-label" style={{ color: "#ff3366" }}>
                  {boltLocale.system_breaches || "SYSTEM BREACHES"}
                </span>
                <div className="breach-slots">
                  {Array.from({ length: maxErrors }).map((_, i) => (
                    <div
                      key={i}
                      className={`breach-slot ${i < heatErrors ? "active" : ""}`}
                    >
                      <div className="slot-glow" />
                      <span className="slot-id">B-0{i + 1}</span>
                      <span className="slot-status">
                        {i < heatErrors ? "VOID" : "SAFE"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="integrity-meter">
                  <div className="meter-label">
                    {boltLocale.core_integrity || "CORE INTEGRITY"}
                  </div>
                  <div className="meter-bar">
                    <div
                      className="meter-fill"
                      style={{
                        width: `${100 - (heatErrors / maxErrors) * 100}%`,
                        background: "#00f2ff",
                        boxShadow: "0 0 10px rgba(0, 242, 255, 0.5)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bottom-hud">
            <div className="error-log container-glass">
              <div className="log-header">ERROR_LOG_INTERNAL</div>
              <div className="log-content-static">
                {errorLog.length === 0 ? (
                  "NO ERRORS DETECTED"
                ) : (
                  <AnimatePresence mode="popLayout">
                    {errorLog.map((log, i) => (
                      <motion.div
                        key={`${log}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="log-entry"
                        style={{
                          color: log.includes("CRITICAL") ? "#ff3366" : "#888",
                        }}
                      >
                        [{new Date().toLocaleTimeString()}] {log}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>

            <div className="system-info-box container-glass">
              <div className="log-header">MECHANICAL_REPAIR_KIT_V2.0</div>
              <div className="info-content-static">
                <div className="info-line">
                  ID: {sessionId?.substring(0, 8) || "N/A"}...
                </div>
                <div className="info-line blink-text">ANALYZING_SYSTEM...</div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {(status === "won" || status === "lost") && (
              <motion.div
                key="boltturn-overlay"
                className="boltturn-status-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  key={`boltturn-card-${status}`}
                  className={`boltturn-status-card ${status}`}
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                >
                  <h1 className="blink-text">
                    {status === "won"
                      ? boltLocale.success_title || "SYSTEM STABILIZED"
                      : boltLocale.fail_title || "SYSTEM OVERHEAT"}
                  </h1>
                  <p>
                    {status === "won"
                      ? boltLocale.success_desc || "PRESSURE LEVELS NOMINAL"
                      : boltLocale.fail_desc || "CRITICAL CORE FAILURE"}
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

export default BoltTurnGame;

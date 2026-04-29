import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMinigameStore } from "../../store/useMinigameStore";
import { fetchNui } from "../../utils/fetchNui";
import { motion, AnimatePresence } from "framer-motion";
import "./BoltTurnGame.css";

const TENSION_BUILD_RATE = 120; // Tension units per second when held
const TENSION_DECAY_RATE = 180; // Tension units per second when released
const MAX_TENSION = 100;
const SWEET_SPOT_WIDTH = 25; // 25% of the dial
const OVERHEAT_PENALTY_MS = 2000;
const PROGRESS_BUILD_RATE = 15; // Progress per second while in sweet spot

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
          style={{ stroke: value > 80 ? "#ff3366" : "#00f2ff" }} // Adjusted to core theme
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
          style={{ color: value > 80 ? "#ff3366" : "#00f2ff" }}
        >
          {Math.round(value)}%
        </span>
        <span className="group-label">{label}</span>
      </div>
    </div>
  );
};

const BoltTurnGame: React.FC = () => {
  const { timeLimit, sessionId, closeGame, gameParams, locale, debug } =
    useMinigameStore();
  const boltLocale = locale || {};
  const initialTimeLimit = useRef(
    gameParams.timeLimit || timeLimit || 45,
  ).current;
  const [timeLeft, setTimeLeft] = useState(initialTimeLimit);

  // Difficulty parameters
  const boltCount = gameParams.boltCount || 4;
  const heatSpeed = gameParams.heatSpeed || 1.0;
  const maxErrors = gameParams.maxMistakes || 3;

  const [boltProgress, setBoltProgress] = useState<number[]>(
    new Array(boltCount).fill(0),
  );
  const [overheated, setOverheated] = useState<boolean[]>(
    new Array(boltCount).fill(false),
  );
  const [glitchedValves, setGlitchedValves] = useState<boolean[]>(
    new Array(boltCount).fill(false),
  );

  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [activeValve, setActiveValve] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [errorLog, setErrorLog] = useState<string[]>([]);

  const tensionRefs = useRef<number[]>(new Array(boltCount).fill(0));
  const overheatedRef = useRef<boolean[]>(new Array(boltCount).fill(false));
  const boltProgressRef = useRef<number[]>(new Array(boltCount).fill(0));
  const mistakesRef = useRef(0);
  const hasEndedRef = useRef(false);
  const reqRef = useRef<number>(undefined);
  const lastTimeRef = useRef<number>(undefined);

  const successSound = useRef<HTMLAudioElement | null>(null);
  const failedSound = useRef<HTMLAudioElement | null>(null);
  const turnSound = useRef<HTMLAudioElement | null>(null);
  const errorSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    successSound.current = new Audio("assets/success.ogg");
    failedSound.current = new Audio("assets/failed.ogg");
    turnSound.current = new Audio("assets/hover.ogg");
    errorSound.current = new Audio("assets/error.ogg");

    return () => {
      successSound.current?.pause();
      failedSound.current?.pause();
      turnSound.current?.pause();
      errorSound.current?.pause();
      successSound.current = null;
      failedSound.current = null;
      turnSound.current = null;
      errorSound.current = null;
    };
  }, []);

  useEffect(() => {
    if (status !== "playing") return;
    const timerInterval = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          handleEnd(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [status]);

  const handleEnd = (win: boolean) => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    setStatus(win ? "won" : "lost");

    if (turnSound.current) {
      turnSound.current.pause();
      turnSound.current.currentTime = 0;
    }

    if (win) {
      successSound.current?.play().catch(() => {});
    } else {
      failedSound.current?.play().catch(() => {});
    }
    fetchNui("minigameEnd", { outcome: win, sessionId });
    setTimeout(closeGame, 2500);
  };

  const triggerOverheat = useCallback(
    (index: number) => {
      if (overheatedRef.current[index]) return;
      overheatedRef.current[index] = true;

      setOverheated((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });

      tensionRefs.current[index] = 0;
      setActiveValve(null);

      mistakesRef.current += 1;
      const nextMistakes = mistakesRef.current;
      setMistakes(nextMistakes);
      if (nextMistakes >= maxErrors) {
        handleEnd(false);
      }

      setErrorLog((prevLogs) => [
        (
          boltLocale.log_overheat || "TORQUE OVERLOAD: BOLT #%s STRIPPED"
        ).replace("%s", (index + 1).toString()),
        ...prevLogs.slice(0, 4),
      ]);

      setGlitchedValves((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });

      setTimeout(() => {
        setGlitchedValves((prev) => {
          const next = [...prev];
          next[index] = false;
          return next;
        });
      }, 500);

      if (errorSound.current) {
        errorSound.current.currentTime = 0;
        errorSound.current.play().catch(() => {});
      }

      setTimeout(() => {
        if (status !== "playing") return;
        overheatedRef.current[index] = false;
        setOverheated((prev) => {
          const restored = [...prev];
          restored[index] = false;
          return restored;
        });
        setErrorLog((prevLogs) => [
          (
            boltLocale.log_restored || "THREADS SECURED: BOLT #%s READY"
          ).replace("%s", (index + 1).toString()),
          ...prevLogs.slice(0, 4),
        ]);
      }, OVERHEAT_PENALTY_MS);
    },
    [maxErrors, boltLocale, status],
  );

  useEffect(() => {
    if (status !== "playing") return;

    const animate = (time: DOMHighResTimeStamp) => {
      if (lastTimeRef.current === undefined) lastTimeRef.current = time;
      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const speedMult = 0.5 * heatSpeed;
      const baseSin = Math.sin(time * 0.001 * speedMult);
      const secondarySin = Math.sin(time * 0.0023 * speedMult);
      const sweetSpotCenter = 50 + baseSin * 20 + secondarySin * 10;

      const ssMin = sweetSpotCenter - SWEET_SPOT_WIDTH / 2;
      const ssMax = sweetSpotCenter + SWEET_SPOT_WIDTH / 2;

      for (let i = 0; i < boltCount; i++) {
        const active = activeValve === i;
        let currentTension = tensionRefs.current[i];
        const isOH = overheatedRef.current[i];

        if (!isOH && boltProgressRef.current[i] < 100) {
          if (active) {
            currentTension += TENSION_BUILD_RATE * deltaTime;
          } else {
            currentTension -= TENSION_DECAY_RATE * deltaTime;
          }
        }

        currentTension = Math.max(0, currentTension);

        if (
          currentTension >= MAX_TENSION &&
          !isOH &&
          boltProgressRef.current[i] < 100
        ) {
          currentTension = MAX_TENSION;
          triggerOverheat(i);
        }

        tensionRefs.current[i] = currentTension;

        const needleEl = document.getElementById(`needle-${i}`);
        const arcEl = document.getElementById(`sweet-arc-${i}`);
        const tensionTextEl = document.getElementById(`tension-text-${i}`);

        if (needleEl) {
          const needleOffset = 283 - (283 * currentTension) / 100;
          needleEl.style.strokeDashoffset = needleOffset.toString();

          if (currentTension > ssMax) {
            needleEl.style.stroke = "#ff3366";
          } else if (currentTension >= ssMin && currentTension <= ssMax) {
            needleEl.style.stroke = "#39ff14";
          } else {
            needleEl.style.stroke = "#00f2ff";
          }
        }

        if (arcEl) {
          const ssWidthPct = SWEET_SPOT_WIDTH;
          const mapToDash = (ssWidthPct / 100) * 283;
          arcEl.style.strokeDasharray = `${mapToDash} 283`;

          const rotationBase = -90;
          const rotationAngle = rotationBase + (ssMin / 100) * 360;

          const svgArcContainer = document.getElementById(`arc-container-${i}`);
          if (svgArcContainer) {
            svgArcContainer.style.transform = `rotate(${rotationAngle}deg)`;
          }
        }

        if (tensionTextEl) {
          tensionTextEl.textContent = `${Math.floor(currentTension)}%`;
        }
      }

      reqRef.current = requestAnimationFrame(animate);
    };
    reqRef.current = requestAnimationFrame(animate);

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [status, activeValve, boltCount, heatSpeed, triggerOverheat]);

  useEffect(() => {
    if (status !== "playing") return;
    const progressTimer = setInterval(() => {
      let allDone = true;
      let hasChanged = false;

      const speedMult = 0.5 * heatSpeed;
      const baseSin = Math.sin(performance.now() * 0.001 * speedMult);
      const secondarySin = Math.sin(performance.now() * 0.0023 * speedMult);
      const sweetSpotCenter = 50 + baseSin * 20 + secondarySin * 10;
      const ssMin = sweetSpotCenter - SWEET_SPOT_WIDTH / 2;
      const ssMax = sweetSpotCenter + SWEET_SPOT_WIDTH / 2;

      const next = [...boltProgressRef.current];

      for (let i = 0; i < boltCount; i++) {
        if (next[i] >= 100 || overheatedRef.current[i]) continue;
        allDone = false;

        const active = activeValve === i;
        if (active) {
          const t = tensionRefs.current[i];
          if (t >= ssMin && t <= ssMax) {
            next[i] = Math.min(100, next[i] + PROGRESS_BUILD_RATE * 0.05); // 50ms tick
            hasChanged = true;
          }
        }
      }

      if (hasChanged) {
        boltProgressRef.current = next;
        setBoltProgress([...next]);
      }

      if (allDone && boltCount > 0) {
        handleEnd(true);
      }
    }, 50);

    return () => clearInterval(progressTimer);
  }, [status, activeValve, boltCount, heatSpeed, handleEnd]);

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

  return (
    <div
      className="boltturn-wrapper"
      onMouseUp={stopTurning}
      onMouseLeave={stopTurning}
    >
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
                {boltLocale.title || "ELEVATOR HYDRAULICS"}
              </span>
              <div className="system-status">
                <span className="status-label">
                  {boltLocale.valves_label || "TORQUE SECURED"}:
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

            <div className="system-id">SYSTEM_ID: MBT_ELEV_MECH</div>
          </div>

          <div className="main-layout">
            <div className="side-indicators boltturn-glass">
              {/* Dummy overall stability derived from progress */}
              <CurvedGauge
                value={
                  (boltProgress.reduce((a, b) => a + b, 0) /
                    (boltCount * 100)) *
                  100
                }
                label={boltLocale.neural_load || "COMPLETION"}
              />

              <div className="indicator-group" style={{ marginTop: "2vmin" }}>
                <span className="stability-value">
                  {Math.max(0, 100 - (mistakes / maxErrors) * 100)}%
                </span>
                <span className="group-label">
                  {boltLocale.stability || "STRUCTURAL INTEGRITY"}
                </span>
              </div>
            </div>

            <div className="bolts-area">
              {boltProgress.map((prog, idx) => (
                <div
                  key={idx}
                  className={`bolt-wrapper ${prog >= 100 ? "bolt-done" : ""} ${overheated[idx] ? "overheated" : ""} ${glitchedValves[idx] ? "card-glitch" : ""}`}
                >
                  <div className="valve-label-top">
                    <span className="valve-id">PULLEY #{idx + 1}</span>
                    <span className="valve-action">TORQUE</span>
                  </div>

                  {/* Tension & Sweet Spot HUD */}
                  <div className="valve-hud">
                    {/* Background Track */}
                    <svg
                      viewBox="0 0 100 100"
                      style={{
                        transform: "rotate(-90deg)",
                        position: "absolute",
                      }}
                    >
                      <circle cx="50" cy="50" r="45" className="hud-ring" />
                    </svg>

                    {/* Rotating Sweet Spot Arc */}
                    <svg
                      id={`arc-container-${idx}`}
                      viewBox="0 0 100 100"
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <circle
                        id={`sweet-arc-${idx}`}
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="rgba(57, 255, 20, 0.4)"
                        strokeWidth="8"
                        strokeDasharray="0 283"
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Player Tension Needle */}
                    <svg
                      viewBox="0 0 100 100"
                      style={{
                        transform: "rotate(-90deg)",
                        position: "absolute",
                      }}
                    >
                      <circle
                        id={`needle-${idx}`}
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#00f2ff"
                        strokeWidth="3"
                        strokeDasharray="283"
                        strokeDashoffset={"283"}
                        style={{ filter: "drop-shadow(0 0 5px currentColor)" }}
                      />
                    </svg>
                  </div>

                  <motion.div
                    className="bolt-svg-container"
                    onMouseDown={() => startTurning(idx)}
                    onMouseLeave={() => {
                      if (activeValve === idx) stopTurning();
                    }}
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
                        r="30"
                        fill="url(#knobGradient)"
                        stroke="#444"
                        strokeWidth="2"
                      />
                      <polygon
                        points="50,15 80,33 80,67 50,85 20,67 20,33"
                        fill="none"
                        stroke="#222"
                        strokeWidth="3"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="8"
                        fill="#222"
                        stroke="#ff9d00"
                        strokeWidth="1"
                        style={{
                          opacity: activeValve === idx ? 1 : 0.4,
                          transition: "opacity 0.2s",
                        }}
                      />
                    </svg>
                  </motion.div>

                  <div
                    className="status-indicators"
                    style={{ marginTop: "1vmin" }}
                  >
                    <div className="label-small">
                      <span>{boltLocale.heat_label || "TENSION"}</span>
                      <span id={`tension-text-${idx}`}>0%</span>
                    </div>
                    <div className="meter-bar">
                      <div
                        className="meter-fill"
                        style={{
                          width: `${prog}%`,
                          background: prog >= 100 ? "#39ff14" : "#00f2ff",
                          boxShadow: `0 0 10px ${prog >= 100 ? "#39ff14" : "#00f2ff"}`,
                          transition: "width 0.2s ease",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="side-indicators-right boltturn-glass">
                <span className="group-label" style={{ color: "#ff3366" }}>
                  {boltLocale.system_breaches || "CABLE SNAPS"}
                </span>
                <div className="breach-slots">
                  {Array.from({ length: maxErrors }).map((_, i) => (
                    <div
                      key={i}
                      className={`breach-slot ${i < mistakes ? "active" : ""}`}
                    >
                      <div className="slot-glow" />
                      <span className="slot-id">F-0{i + 1}</span>
                      <span className="slot-status">
                        {i < mistakes ? "STRIPPED" : "INTACT"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="integrity-meter">
                  <div className="meter-label">
                    {boltLocale.core_integrity || "STRUCTURAL INTEGRITY"}
                  </div>
                  <div className="meter-bar">
                    <div
                      className="meter-fill"
                      style={{
                        width: `${Math.max(0, 100 - (mistakes / maxErrors) * 100)}%`,
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
            <div className="error-log boltturn-glass">
              <div className="log-header">
                {boltLocale.log_header || "MECHANICAL_LOG_INTERNAL"}
              </div>
              <div className="log-content-static">
                {errorLog.length === 0 ? (
                  boltLocale.log_empty || "AWAITING TORQUE APPLICATION"
                ) : (
                  <AnimatePresence mode="popLayout">
                    {errorLog.map((log, i) => (
                      <motion.div
                        key={`${log}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="log-entry"
                        style={{
                          color: log.includes("STRIPPED") ? "#ff3366" : "#888",
                        }}
                      >
                        [{new Date().toLocaleTimeString()}] {log}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>

            <div className="system-info-box boltturn-glass">
              <div className="log-header">MECHANICAL_REPAIR_KIT_V2.0</div>
              <div className="info-content-static">
                <div className="info-line">
                  ID: {sessionId?.substring(0, 8) || "N/A"}...
                </div>
                <div className="info-line blink-text">ANALYZING_TORQUE...</div>
                <div
                  className="info-line"
                  style={{ color: "#39ff14", marginTop: "1vmin" }}
                >
                  * HOLD MOUSE TO APPLY FORCE
                  <br />* KEEP TENSION IN GREEN ARC
                </div>
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
                      ? boltLocale.won || "PULLEYS SECURED"
                      : boltLocale.lost || "MECHANICAL FAILURE"}
                  </h1>
                  <p>
                    {status === "won"
                      ? boltLocale.won_sub || "TORQUE LEVELS NOMINAL"
                      : timeLeft <= 0
                        ? boltLocale.lost_sub_time || "TIME EXPIRED"
                        : boltLocale.lost_sub_meltdown || "CRITICAL CABLE SNAP"}
                  </p>
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

export default BoltTurnGame;

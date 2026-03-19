import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMinigameStore } from "../../store/useMinigameStore";
import { fetchNui } from "../../utils/fetchNui";
import { motion, AnimatePresence } from "framer-motion";
import "./BoltTurnGame.css";

const BoltTurnGame: React.FC = () => {
  const { timeLimit, sessionId, closeGame, gameParams, locale, debug } = useMinigameStore();
  const boltLocale = locale?.bolt_turn || {};

  const totalBolts = gameParams.boltCount || 4;
  const initialTimeLimit = useRef(gameParams.timeLimit || timeLimit || 20).current;

  const [timeLeft, setTimeLeft] = useState(initialTimeLimit);
  const [bolts, setBolts] = useState<number[]>([]); // Current rotation of each bolt: 0, 90, 180, 270
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [completedBolts, setCompletedBolts] = useState<boolean[]>([]);

  const successSound = useRef<HTMLAudioElement | null>(null);
  const failedSound = useRef<HTMLAudioElement | null>(null);
  const turnSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    successSound.current = new Audio("assets/success.ogg");
    failedSound.current = new Audio("assets/failed.ogg");
    turnSound.current = new Audio("assets/hover.ogg");
  }, []);

  const handleEnd = useCallback(
    (win: boolean) => {
      if (status !== "playing") return;
      setStatus(win ? "won" : "lost");

      if (win) {
        successSound.current?.play().catch(() => {});
      } else {
        failedSound.current?.play().catch(() => {});
      }

      fetchNui("hackingEnd", { outcome: win, sessionId });
      setTimeout(closeGame, 2500);
    },
    [status, sessionId, closeGame]
  );

  // Initial setup: create bolts with random initial rotations (multiples of 90)
  useEffect(() => {
    const initialRotations: number[] = [];
    const initialCompletion: boolean[] = [];

    for (let i = 0; i < totalBolts; i++) {
      // 0, 90, 180, or 270 degrees. 0 deg means "straight/locked"
      const rot = (Math.floor(Math.random() * 3) + 1) * 90;
      initialRotations.push(rot);
      initialCompletion.push(false);
    }

    setBolts(initialRotations);
    setCompletedBolts(initialCompletion);
  }, [totalBolts]);

  // Timer: Stop when not playing
  useEffect(() => {
    if (status !== "playing") return;

    const interval = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (status !== "playing") return prev;
        if (prev <= 1) {
          handleEnd(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, handleEnd]);

  const handleBoltClick = (index: number) => {
    if (status !== "playing") return;
    if (completedBolts[index]) return;

    if (turnSound.current) {
      turnSound.current.currentTime = 0;
      turnSound.current.play().catch(() => {});
    }

    const newBolts = [...bolts];
    // Rotate +90 degrees. If it hits 360, reset to 0
    newBolts[index] = (newBolts[index] + 90) % 360;
    setBolts(newBolts);

    // Check if this bolt is now at 0 (locked)
    if (newBolts[index] === 0) {
      const newCompletion = [...completedBolts];
      newCompletion[index] = true;
      setCompletedBolts(newCompletion);

      // Check if all bolts are locked
      if (newCompletion.every((b) => b)) {
        handleEnd(true);
      }
    }
  };

  return (
    <div className="boltturn-wrapper">
      <motion.div
        className="boltturn-frame"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
      >
        <div className="boltturn-container glass-morphism">
          <div className="boltturn-header">
            <div className="header-info">
              <h2 className="title">{boltLocale.title || "HYDRAULIC RELEASE"}</h2>
              <p className="subtitle">{boltLocale.subtitle || "ALIGN MAGNETIC BOLTS"}</p>
            </div>
            <div className={`boltturn-timer ${timeLeft < 5 ? "warning" : ""}`}>{timeLeft}s</div>
          </div>

          <div className="bolts-grid">
            {bolts.map((rot, idx) => (
              <div key={idx} className="bolt-slot">
                <motion.div
                  className={`bolt-item ${completedBolts[idx] ? "locked" : ""}`}
                  animate={{ rotate: rot }}
                  onClick={() => handleBoltClick(idx)}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="bolt-handle" />
                  <div className="bolt-glow" />
                </motion.div>
                <div className={`status-indicator ${completedBolts[idx] ? "ready" : ""}`} />
              </div>
            ))}
          </div>

          <div className="boltturn-footer">
            <div className="instruction-text blink-text">
               {boltLocale.warning || "CLICK BOLTS TO LOCK INTO VERTICAL POSITION"}
            </div>
          </div>

          <AnimatePresence>
            {(status === "won" || status === "lost") && (
              <motion.div 
                className="bolt-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                 <motion.div 
                   className={`status-message ${status}`}
                   initial={{ y: 50, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                 >
                    <h1>{status === "won" ? boltLocale.won || "RELEASED" : boltLocale.lost || "MECHANISM JAMMED"}</h1>
                    <p>{status === "won" ? boltLocale.won_sub || "LOCKS DISENGAGED" : boltLocale.lost_sub || "SESSION TERMINATED"}</p>
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

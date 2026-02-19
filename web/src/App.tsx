import React, { useEffect } from "react";
import { useMinigameStore } from "./store/useMinigameStore";
import { AnimatePresence, motion } from "framer-motion";
import HackingGame from "./components/minigames/HackingGame";
import WireFixGame from "./components/minigames/WireFixGame";
import BoltTurnGame from "./components/minigames/BoltTurnGame";
import CodeMatchGame from "./components/minigames/CodeMatchGame";
import "./App.css";

const App: React.FC = () => {
  const { show, gameType, openGame, closeGame } = useMinigameStore();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data.Action === "handleUI") {
        if (data.Status) {
          const type = data.Payload.Type || "hacking";
          openGame(
            type as any,
            data.Payload.Id,
            data.Payload.TimeLimit,
            data.Payload.Params,
            data.Payload.Locale,
          );
        } else {
          closeGame();
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [openGame, closeGame]);

  return (
    <div className="scanline-overlay">
      <AnimatePresence mode="wait">
        {show && (
          <motion.div
            key={gameType}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {gameType === "hacking" && <HackingGame />}
            {gameType === "wire_fix" && <WireFixGame />}
            {gameType === "bolt_turn" && <BoltTurnGame />}
            {gameType === "code_match" && <CodeMatchGame />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;

import React, { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useMinigameStore } from "./store/useMinigameStore";
import type { MinigameType, GameParams, Locale } from "./store/useMinigameStore";

const VALID_GAME_TYPES: MinigameType[] = ["hacking", "wire_fix", "bolt_turn", "code_match"];
import { AnimatePresence, motion } from "framer-motion";
import HackingGame from "./components/minigames/HackingGame";
import WireFixGame from "./components/minigames/WireFixGame";
import BoltTurnGame from "./components/minigames/BoltTurnGame";
import CodeMatchGame from "./components/minigames/CodeMatchGame";
import "./App.css";

interface NuiMessage {
  Action?: string;
  Status?: boolean;
  Payload?: {
    Type?: string;
    Id: string;
    TimeLimit: number;
    Params?: GameParams;
    Locale?: Locale;
    Debug?: boolean;
  };
}

const App: React.FC = () => {
  const { show, gameType, openGame, closeGame } = useMinigameStore(
    useShallow((s) => ({
      show: s.show,
      gameType: s.gameType,
      openGame: s.openGame,
      closeGame: s.closeGame,
    })),
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent<NuiMessage>) => {
      const data = event.data;
      if (data.Action === "handleUI") {
        if (data.Status && data.Payload) {
          const raw = data.Payload.Type;
          const type = raw && VALID_GAME_TYPES.includes(raw as MinigameType) ? (raw as MinigameType) : null;
          if (!type) return;
          openGame(
            type,
            data.Payload.Id,
            data.Payload.TimeLimit,
            data.Payload.Params,
            data.Payload.Locale,
            data.Payload.Debug,
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

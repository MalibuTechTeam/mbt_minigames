import { create } from 'zustand';

export type MinigameType = 'none' | 'hacking' | 'wire_fix' | 'bolt_turn' | 'code_match';

interface MinigameState {
  show: boolean;
  gameType: MinigameType;
  sessionId: string | null;
  timeLimit: number;
  openGame: (type: MinigameType, sessionId: string, timeLimit: number) => void;
  closeGame: () => void;
}

export const useMinigameStore = create<MinigameState>((set) => ({
  show: false,
  gameType: 'none',
  sessionId: null,
  timeLimit: 0,
  openGame: (type, sessionId, timeLimit) => set({ show: true, gameType: type, sessionId, timeLimit }),
  closeGame: () => set({ show: false, gameType: 'none', sessionId: null, timeLimit: 0 }),
}));

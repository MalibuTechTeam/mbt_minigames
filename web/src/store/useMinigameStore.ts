import { create } from 'zustand';

export type MinigameType = 'none' | 'hacking' | 'wire_fix' | 'bolt_turn' | 'code_match';

interface MinigameState {
  show: boolean;
  gameType: MinigameType;
  sessionId: string | null;
  timeLimit: number;
  gameParams: any;
  locale: any;
  openGame: (type: MinigameType, sessionId: string, timeLimit: number, gameParams?: any, locale?: any) => void;
  closeGame: () => void;
}

export const useMinigameStore = create<MinigameState>((set) => ({
  show: false,
  gameType: 'none',
  sessionId: null,
  timeLimit: 0,
  gameParams: {},
  locale: {},
  openGame: (type, sessionId, timeLimit, gameParams = {}, locale = {}) => 
    set({ show: true, gameType: type, sessionId, timeLimit, gameParams, locale }),
  closeGame: () => set({ show: false, gameType: 'none', sessionId: null, timeLimit: 0, gameParams: {}, locale: {} }),
}));

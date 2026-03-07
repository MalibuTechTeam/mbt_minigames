import { create } from 'zustand';

export type MinigameType = 'none' | 'hacking' | 'wire_fix' | 'bolt_turn' | 'code_match';

interface MinigameState {
  show: boolean;
  gameType: MinigameType;
  sessionId: string | null;
  timeLimit: number;
  gameParams: any;
  locale: any;
  debug: boolean;
  openGame: (type: MinigameType, sessionId: string, timeLimit: number, gameParams?: any, locale?: any, debug?: boolean) => void;
  closeGame: () => void;
}

export const useMinigameStore = create<MinigameState>((set) => ({
  show: false,
  gameType: 'none',
  sessionId: null,
  timeLimit: 0,
  gameParams: {},
  locale: {},
  debug: false,
  openGame: (type, sessionId, timeLimit, gameParams = {}, locale = {}, debug = false) => 
    set({ show: true, gameType: type, sessionId, timeLimit, gameParams, locale, debug }),
  closeGame: () => set({ show: false, gameType: 'none', sessionId: null, timeLimit: 0, gameParams: {}, locale: {}, debug: false }),
}));

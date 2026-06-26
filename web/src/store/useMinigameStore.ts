import { create } from 'zustand';

export type MinigameType = 'none' | 'hacking' | 'wire_fix' | 'bolt_turn' | 'code_match';

/**
 * Payload dinamici inviati dal Lua via NUI message. Le forme variano per
 * minigame (vedi tabella nella spec), quindi sono tipizzati in modo "loose":
 * descrivono ciò che il Lua manda senza vincolare il contratto pubblico.
 */
export type GameParams = Record<string, number | undefined>;
export type Locale = Record<string, string | string[] | undefined>;

interface MinigameState {
  show: boolean;
  gameType: MinigameType;
  sessionId: string | null;
  timeLimit: number;
  gameParams: GameParams;
  locale: Locale;
  debug: boolean;
  openGame: (type: MinigameType, sessionId: string, timeLimit: number, gameParams?: GameParams, locale?: Locale, debug?: boolean) => void;
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

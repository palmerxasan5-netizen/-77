export interface PlayerData {
  balance: number;
  lastDaily: number | null;
  lastWork: number | null;
}

export interface EconomyStore {
  players: Record<string, PlayerData>;
  lastTaxRun: number | null;
}

export interface LobbyPlayer {
  userId: string;
  username: string;
  displayName: string;
  bet: number;
}

export interface TileState {
  index: number;
  revealed: boolean;
  isBomb: boolean;
}

export type GamePhase =
  | "lobby"
  | "playing"
  | "final_two"
  | "ended";

export interface GameState {
  channelId: string;
  messageId: string;
  hostId: string;
  players: LobbyPlayer[];
  phase: GamePhase;
  tiles: TileState[];
  bombCount: number;
  tileCount: number;
  prizePool: number;
  currentPlayerIndex: number;
  turnTimer: ReturnType<typeof setTimeout> | null;
  activePlayers: string[]; // userIds still in game
  finalTwoChosen: Record<string, "bomb" | "safe">; // for final showdown
  turnStartedAt: number;
}

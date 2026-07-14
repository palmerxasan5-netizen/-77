import type { GameState } from "./types.js";

// One game per channel
const activeGames = new Map<string, GameState>();

export function getGame(channelId: string): GameState | undefined {
  return activeGames.get(channelId);
}

export function setGame(channelId: string, state: GameState): void {
  activeGames.set(channelId, state);
}

export function deleteGame(channelId: string): void {
  const game = activeGames.get(channelId);
  if (game?.turnTimer) clearTimeout(game.turnTimer);
  activeGames.delete(channelId);
}

export function hasGame(channelId: string): boolean {
  return activeGames.has(channelId);
}

/** How many tiles / bombs based on player count */
export function getTileConfig(playerCount: number): {
  tileCount: number;
  bombCount: number;
} {
  if (playerCount <= 4) return { tileCount: 10, bombCount: randomBombs(2, 3) };
  if (playerCount <= 6) return { tileCount: 12, bombCount: 4 };
  if (playerCount <= 8) return { tileCount: 14, bombCount: 6 };
  if (playerCount <= 11) return { tileCount: 16, bombCount: 8 };
  return { tileCount: 18, bombCount: 10 };
}

function randomBombs(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Shuffle an array in-place (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Build a fresh tile array with hidden bombs */
export function buildTiles(
  tileCount: number,
  bombCount: number
): { index: number; revealed: boolean; isBomb: boolean }[] {
  const positions = Array.from({ length: tileCount }, (_, i) => i);
  shuffle(positions);
  const bombSet = new Set(positions.slice(0, bombCount));
  return Array.from({ length: tileCount }, (_, i) => ({
    index: i,
    revealed: false,
    isBomb: bombSet.has(i),
  }));
}

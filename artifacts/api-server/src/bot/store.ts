import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { EconomyStore, PlayerData } from "./types.js";

const DATA_DIR = join(process.cwd(), "data");
const ECONOMY_FILE = join(DATA_DIR, "economy.json");
const STARTING_BALANCE = 5000;

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadStore(): EconomyStore {
  ensureDir();
  if (!existsSync(ECONOMY_FILE)) {
    return { players: {}, lastTaxRun: null };
  }
  try {
    const raw = readFileSync(ECONOMY_FILE, "utf-8");
    return JSON.parse(raw) as EconomyStore;
  } catch {
    return { players: {}, lastTaxRun: null };
  }
}

export function saveStore(store: EconomyStore): void {
  ensureDir();
  writeFileSync(ECONOMY_FILE, JSON.stringify(store, null, 2));
}

export function getPlayer(userId: string): PlayerData {
  const store = loadStore();
  if (!store.players[userId]) {
    store.players[userId] = {
      balance: STARTING_BALANCE,
      lastDaily: null,
      lastWork: null,
    };
    saveStore(store);
  }
  return store.players[userId]!;
}

export function updatePlayer(userId: string, data: Partial<PlayerData>): void {
  const store = loadStore();
  if (!store.players[userId]) {
    store.players[userId] = {
      balance: STARTING_BALANCE,
      lastDaily: null,
      lastWork: null,
    };
  }
  Object.assign(store.players[userId]!, data);
  saveStore(store);
}

export function addBalance(userId: string, amount: number): number {
  const player = getPlayer(userId);
  const newBalance = Math.max(0, player.balance + amount);
  updatePlayer(userId, { balance: newBalance });
  return newBalance;
}

export function getBalance(userId: string): number {
  return getPlayer(userId).balance;
}

export function getAllPlayers(): Record<string, PlayerData> {
  return loadStore().players;
}

export function setLastTaxRun(ts: number): void {
  const store = loadStore();
  store.lastTaxRun = ts;
  saveStore(store);
}

export function getLastTaxRun(): number | null {
  return loadStore().lastTaxRun;
}

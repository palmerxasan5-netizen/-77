import type { Client } from "discord.js";
import { getAllPlayers, addBalance, getLastTaxRun, setLastTaxRun } from "./store.js";
import { logger } from "../lib/logger.js";

const TAX_AMOUNT = 2500;
const TAX_THRESHOLD = 25000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function scheduleTax(client: Client): void {
  // Check every hour if we need to run tax
  setInterval(() => runTaxIfDue(client), 60 * 60 * 1000);
  // Also run on startup
  void runTaxIfDue(client);
}

async function runTaxIfDue(client: Client): Promise<void> {
  const lastRun = getLastTaxRun();
  const now = Date.now();

  if (lastRun !== null && now - lastRun < THREE_DAYS_MS) return;

  setLastTaxRun(now);

  const players = getAllPlayers();
  let taxCount = 0;

  for (const [userId, data] of Object.entries(players)) {
    if (data.balance >= TAX_THRESHOLD) {
      addBalance(userId, -TAX_AMOUNT);
      taxCount++;
      // Try to DM the player
      try {
        const user = await client.users.fetch(userId);
        await user.send({
          embeds: [
            {
              title: "🏦  Cashuurta La Qaatay",
              description:
                `**$${TAX_AMOUNT.toLocaleString()}** ayaa laga jaaray xisaabtaada.\n\n` +
                `**Sababta:** Cashuurta todobaadle ee toos ah *(xisaabaha $25,000 ka sareeya ayaa saameeysa)*`,
              color: 0xff6b00,
              timestamp: new Date().toISOString(),
            },
          ],
        });
      } catch {
        // User has DMs disabled — silently skip
      }
    }
  }

  if (taxCount > 0) {
    logger.info({ taxCount }, "Tax collected from rich players");
  }
}

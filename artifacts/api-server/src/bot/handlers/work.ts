import type { Message } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getPlayer, addBalance, updatePlayer } from "../store.js";

const COOLDOWN_MS = 2 * 60 * 60 * 1000;
const WORK_PAY = 500;

function formatDuration(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} Hour${h !== 1 ? "s" : ""}`);
  if (m > 0) parts.push(`${m} Minute${m !== 1 ? "s" : ""}`);
  if (s > 0) parts.push(`${s} Second${s !== 1 ? "s" : ""}`);
  return parts.join(" ");
}

const JOBS = [
  "delivered packages across town 📦",
  "cleaned the office windows 🪟",
  "drove for a rideshare app 🚗",
  "helped at a food truck 🌮",
  "coded a small script for a client 💻",
  "walked dogs in the neighborhood 🐕",
  "tutored a student online 📚",
  "fixed a neighbor's fence 🔨",
];

export async function handleWork(message: Message): Promise<void> {
  const userId = message.author.id;
  const player = getPlayer(userId);
  const now = Date.now();

  if (player.lastWork !== null && now - player.lastWork < COOLDOWN_MS) {
    const remaining = COOLDOWN_MS - (now - player.lastWork);
    const embed = new EmbedBuilder()
      .setTitle("⏳  Already Worked!")
      .setColor(0xff6b00)
      .setDescription(
        `You've already worked recently. Take a break!\n\n` +
          `⏰  **Time Remaining: ${formatDuration(remaining)}**`
      )
      .setTimestamp();
    await message.reply({ embeds: [embed] });
    return;
  }

  const newBalance = addBalance(userId, WORK_PAY);
  updatePlayer(userId, { lastWork: now });

  const job = JOBS[Math.floor(Math.random() * JOBS.length)]!;

  const embed = new EmbedBuilder()
    .setTitle("💼  Work Done!")
    .setColor(0x00c853)
    .setDescription(
      `You ${job}\n\n` +
        `💵  **Earned: $${WORK_PAY.toLocaleString()}**\n` +
        `💼  **New Balance: $${newBalance.toLocaleString()}**`
    )
    .setFooter({ text: "You can work again in 2 hours." })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

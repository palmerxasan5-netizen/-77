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
  if (h > 0) parts.push(`${h} saac`);
  if (m > 0) parts.push(`${m} dq`);
  if (s > 0) parts.push(`${s} th`);
  return parts.join(" ");
}

const JOBS = [
  "baakadooyin ayaad geysay 📦",
  "daaqadaha xafiiska ayaad nadiifisay 🪟",
  "taksi ayaad watay 🚗",
  "baaxad raashinka ayaad ka caawinay 🌮",
  "koodhka yar oo macmiil ah ayaad qortay 💻",
  "eyda xaafadda ayaad socodsiisay 🐕",
  "ardayga online ayaad barisay 📚",
  "xaafadda deriska ayaad faraskeeda hagaajisay 🔨",
];

export async function handleWork(message: Message): Promise<void> {
  const userId = message.author.id;
  const player = getPlayer(userId);
  const now = Date.now();

  if (player.lastWork !== null && now - player.lastWork < COOLDOWN_MS) {
    const remaining = COOLDOWN_MS - (now - player.lastWork);
    const embed = new EmbedBuilder()
      .setTitle("⏳  Horay ayaad u shaqeysay!")
      .setColor(0xff6b00)
      .setDescription(
        `Wakhti yar ka dib ayaad dib u shaqeysan kartaa.\n\n` +
          `⏰  **Wakhti haray: ${formatDuration(remaining)}**`
      )
      .setTimestamp();
    await message.reply({ embeds: [embed] });
    return;
  }

  const newBalance = addBalance(userId, WORK_PAY);
  updatePlayer(userId, { lastWork: now });

  const job = JOBS[Math.floor(Math.random() * JOBS.length)]!;

  const embed = new EmbedBuilder()
    .setTitle("💼  Shaqo la dhammeystay!")
    .setColor(0x00c853)
    .setDescription(
      `Waxaad ${job}\n\n` +
        `💵  **Lacag la helay: $${WORK_PAY.toLocaleString()}**\n` +
        `💼  **Xisaabta cusub: $${newBalance.toLocaleString()}**`
    )
    .setFooter({ text: "2 saac kadib ayaad dib u shaqeysan kartaa." })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

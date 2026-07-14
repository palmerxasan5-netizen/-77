import type { Message } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getPlayer, addBalance, updatePlayer } from "../store.js";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface Reward {
  label: string;
  amount: number;
  weight: number;
  color: number;
}

const REWARDS: Reward[] = [
  { label: "❌  Bad Luck! You lost money", amount: -500, weight: 10, color: 0xff2222 },
  { label: "💵  You won",                   amount: 500,  weight: 35, color: 0x00c853 },
  { label: "💵  You won",                   amount: 1000, weight: 25, color: 0x00c853 },
  { label: "💵  You won",                   amount: 2000, weight: 13, color: 0x00c853 },
  { label: "💵  You won",                   amount: 3000, weight: 8,  color: 0xffd700 },
  { label: "💵  You won",                   amount: 4000, weight: 5,  color: 0xffd700 },
  { label: "💵  You won",                   amount: 5000, weight: 3,  color: 0xffd700 },
  { label: "💰  JACKPOT! You won",          amount: 10000,weight: 1,  color: 0xff6b00 },
];

const TOTAL_WEIGHT = REWARDS.reduce((s, r) => s + r.weight, 0);

function pickReward(): Reward {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const r of REWARDS) {
    if (roll < r.weight) return r;
    roll -= r.weight;
  }
  return REWARDS[1]!;
}

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

export async function handleDaily(message: Message): Promise<void> {
  const userId = message.author.id;
  const player = getPlayer(userId);
  const now = Date.now();

  if (player.lastDaily !== null && now - player.lastDaily < COOLDOWN_MS) {
    const remaining = COOLDOWN_MS - (now - player.lastDaily);
    const embed = new EmbedBuilder()
      .setTitle("⏳  Already Claimed!")
      .setColor(0xff6b00)
      .setDescription(
        `You've already claimed your daily reward.\n\n` +
          `⏰  **Time Remaining: ${formatDuration(remaining)}**`
      )
      .setTimestamp();
    await message.reply({ embeds: [embed] });
    return;
  }

  const reward = pickReward();
  const newBalance = addBalance(userId, reward.amount);
  updatePlayer(userId, { lastDaily: now });

  const isJackpot = reward.amount === 10000;
  const isLoss = reward.amount < 0;

  const embed = new EmbedBuilder()
    .setTitle(isJackpot ? "🎰  JACKPOT!!!" : isLoss ? "💸  Bad Luck!" : "🎁  Daily Reward!")
    .setColor(reward.color)
    .setDescription(
      `${reward.label} **$${Math.abs(reward.amount).toLocaleString()}**!\n\n` +
        `💼  **New Balance: $${newBalance.toLocaleString()}**`
    )
    .setFooter({ text: "Come back in 24 hours for your next reward!" })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

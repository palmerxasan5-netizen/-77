import type { Message } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { addBalance, getBalance } from "../store.js";

const OWNER_ID = process.env["BOT_OWNER_ID"] ?? "";

export async function handleDeduct(message: Message, args: string[]): Promise<void> {
  if (message.author.id !== OWNER_ID) {
    await message.reply("❌  Only the bot owner can use this command.");
    return;
  }

  const mention = message.mentions.users.first();
  if (!mention) {
    await message.reply("❌  Usage: `!deduct @user amount`");
    return;
  }

  const amountStr = args[1];
  const amount = amountStr ? parseInt(amountStr, 10) : NaN;
  if (isNaN(amount) || amount <= 0) {
    await message.reply("❌  Please enter a valid positive amount.");
    return;
  }

  const currentBalance = getBalance(mention.id);
  const deducted = Math.min(amount, currentBalance);
  const newBalance = addBalance(mention.id, -deducted);

  const embed = new EmbedBuilder()
    .setTitle("💸  Money Deducted")
    .setColor(0xff6b00)
    .setDescription(
      `✅  Removed **$${deducted.toLocaleString()}** from **${mention.displayName}**'s wallet.\n\n` +
        `💼  New balance: **$${newBalance.toLocaleString()}**`
    )
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

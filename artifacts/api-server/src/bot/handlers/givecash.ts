import type { Message } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getBalance, addBalance } from "../store.js";

export async function handleGiveCash(message: Message, args: string[]): Promise<void> {
  const mention = message.mentions.users.first();
  if (!mention) {
    await message.reply("❌  Usage: `!givecash @user amount`");
    return;
  }
  if (mention.id === message.author.id) {
    await message.reply("❌  You can't give money to yourself.");
    return;
  }
  if (mention.bot) {
    await message.reply("❌  You can't give money to a bot.");
    return;
  }

  const amountStr = args[1];
  const amount = amountStr ? parseInt(amountStr, 10) : NaN;
  if (isNaN(amount) || amount <= 0) {
    await message.reply("❌  Please enter a valid positive amount. Example: `!givecash @user 500`");
    return;
  }

  const senderBalance = getBalance(message.author.id);
  if (senderBalance < amount) {
    await message.reply(
      `❌  You don't have enough money. Your balance: **$${senderBalance.toLocaleString()}**`
    );
    return;
  }

  addBalance(message.author.id, -amount);
  const receiverBalance = addBalance(mention.id, amount);

  const embed = new EmbedBuilder()
    .setTitle("💸  Cash Sent!")
    .setColor(0x00c853)
    .setDescription(
      `**${message.author.displayName}** sent **$${amount.toLocaleString()}** to **${mention.displayName}**!\n\n` +
        `💼  **${mention.displayName}'s new balance: $${receiverBalance.toLocaleString()}**`
    )
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

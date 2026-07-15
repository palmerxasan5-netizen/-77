import type { Message } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getBalance, addBalance } from "../store.js";

export async function handleGiveCash(message: Message, args: string[]): Promise<void> {
  const mention = message.mentions.users.first();
  if (!mention) {
    await message.reply("❌  Isticmaal: `!givecash @qof xad`");
    return;
  }
  if (mention.id === message.author.id) {
    await message.reply("❌  Nafta lacag iskuma siin kartid.");
    return;
  }
  if (mention.bot) {
    await message.reply("❌  Bot-ka lacag luma siin karo.");
    return;
  }

  const amountStr = args[1];
  const amount = amountStr ? parseInt(amountStr, 10) : NaN;
  if (isNaN(amount) || amount <= 0) {
    await message.reply("❌  Xad sax ah geli. Tusaale: `!givecash @qof 500`");
    return;
  }

  const senderBalance = getBalance(message.author.id);
  if (senderBalance < amount) {
    await message.reply(
      `❌  Lacag kuma filna. Xisaabtaada: **$${senderBalance.toLocaleString()}**`
    );
    return;
  }

  addBalance(message.author.id, -amount);
  const receiverBalance = addBalance(mention.id, amount);

  const embed = new EmbedBuilder()
    .setTitle("💸  Lacag La Diray!")
    .setColor(0x00c853)
    .setDescription(
      `**${message.author.displayName}** wuxuu u diray **${mention.displayName}** lacag **$${amount.toLocaleString()}**!\n\n` +
        `💼  **Xisaabta cusub ee ${mention.displayName}: $${receiverBalance.toLocaleString()}**`
    )
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

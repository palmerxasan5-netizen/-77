import type { Message } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { addBalance } from "../store.js";

const OWNER_ID = process.env["BOT_OWNER_ID"] ?? "";

export async function handleGrant(message: Message, args: string[]): Promise<void> {
  if (message.author.id !== OWNER_ID) {
    await message.reply("❌  Amarka waxaa isticmaali kara bot-ka milkiilaha kaliya.");
    return;
  }

  const mention = message.mentions.users.first();
  if (!mention) {
    await message.reply("❌  Isticmaal: `!grant @qof xad`");
    return;
  }

  const amountStr = args[1];
  const amount = amountStr ? parseInt(amountStr, 10) : NaN;
  if (isNaN(amount) || amount <= 0) {
    await message.reply("❌  Xad sax ah geli.");
    return;
  }

  const newBalance = addBalance(mention.id, amount);

  const embed = new EmbedBuilder()
    .setTitle("💰  Lacag La Siiyay")
    .setColor(0xffd700)
    .setDescription(
      `✅  **$${amount.toLocaleString()}** ayaa loogu daray **${mention.displayName}**.\n\n` +
        `💼  Xisaabta cusub: **$${newBalance.toLocaleString()}**`
    )
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

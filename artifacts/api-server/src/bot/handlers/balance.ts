import type { Message } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getBalance } from "../store.js";

export async function handleBalance(message: Message): Promise<void> {
  const userId = message.author.id;
  const balance = getBalance(userId);

  const embed = new EmbedBuilder()
    .setTitle("💼  Your Wallet")
    .setColor(balance === 0 ? 0xff2222 : 0x00c853)
    .setDescription(
      balance === 0
        ? `> 💸 Lacagtaadu waxay tahay **$0**\n> *Fadlan lacag ku shubo!*`
        : `> 💰  **${balance.toLocaleString()}**`
    )
    .setFooter({ text: `${message.author.username}` })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

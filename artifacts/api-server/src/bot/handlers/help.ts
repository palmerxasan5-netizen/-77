import { type Message, EmbedBuilder } from "discord.js";

export async function handleHelp(message: Message): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle("💣  BOMB SURVIVAL — Commands")
    .setColor(0x3b82f6)
    .setDescription("Hoos waxaa ku qoran amarrada bot-ka oo dhan.")
    .addFields(
      {
        name: "🎮  Ciyaarta",
        value: [
          "`!bomb` — Bilow lobby cusub oo Bomb Survival ah",
          "> *Marka lobby la furo: **Ku biir** si aad u gasho, lacag dooro, ka dibna Host-ku wuu bilaabaa.*",
        ].join("\n"),
        inline: false,
      },
      {
        name: "💰  Lacagta",
        value: [
          "`!balance` / `!bal` — Arag xisaabtaada lacagta",
          "`!work` — Shaqee lacag yar hel (cooldown 1 saac)",
          "`!givecash @qof <xad>` — Naf-xad u dir qof kale",
        ].join("\n"),
        inline: false,
      },
      {
        name: "🛡️  Admin Only",
        value: [
          "`!grant @qof <xad>` — Lacag ku dar qof",
          "`!deduct @qof <xad>` — Lacag ka jar qof",
        ].join("\n"),
        inline: false,
      },
      {
        name: "💡  Sida ciyaarta loo ciyaaro",
        value: [
          "1️⃣  `!bomb` riix — lobby ayaa furmi doona",
          "2️⃣  Qofkasta **Ku biir** riix, lacag dooro",
          "3️⃣  Host-ku **Bilaab hadda** riixo",
          "4️⃣  Keli keli tiles doorso — bomb ha gaarin!",
          "5️⃣  Mid u dambeeyaa ee badbaado ayaa abaalmarinta guusha",
        ].join("\n"),
        inline: false,
      },
      {
        name: "⚠️  Tax Nidaam",
        value: "Marka 3 maalmood oo la soo dhaafay, **$2,500** ayaa laga jari doonaa xisaabaha $25,000 ka sareeya.",
        inline: false,
      }
    )
    .setFooter({ text: "!help — amarka aad hadda ku jirtid" })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

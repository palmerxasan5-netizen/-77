import {
  Client,
  GatewayIntentBits,
  Events,
  type ButtonInteraction,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { handleButtonInteraction } from "./interactions.js";
import { handleBomb } from "./handlers/bomb.js";
import { handleBalance } from "./handlers/balance.js";
import { handleWork } from "./handlers/work.js";
import { handleGiveCash } from "./handlers/givecash.js";
import { handleGrant } from "./handlers/grant.js";
import { handleDeduct } from "./handlers/deduct.js";
import { handleHelp } from "./handlers/help.js";
import { scheduleTax } from "./tax.js";

const PREFIX = "!";

export function startBot(): void {
  const token = process.env["DISCORD_TOKEN"];
  if (!token) {
    logger.warn(
      "DISCORD_TOKEN not set — bot will not start. Add your token to begin."
    );
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, (readyClient) => {
    logger.info({ tag: readyClient.user.tag }, "Discord bot online!");
    scheduleTax(client);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const raw = message.content.slice(PREFIX.length).trim();
    const [cmd, ...rest] = raw.split(/\s+/);
    const command = cmd?.toLowerCase();

    try {
      switch (command) {
        case "bomb":
          await handleBomb(message);
          break;
        case "balance":
        case "bal":
          await handleBalance(message);
          break;
        case "work":
          await handleWork(message);
          break;
        case "givecash":
        case "give": {
          // args: first element after mention is the amount
          const amountArg = rest.find((a) => !a.startsWith("<@"));
          await handleGiveCash(message, [rest[0] ?? "", amountArg ?? ""]);
          break;
        }
        case "grant":
          await handleGrant(message, [rest[0] ?? "", rest[1] ?? ""]);
          break;
        case "deduct":
          await handleDeduct(message, [rest[0] ?? "", rest[1] ?? ""]);
          break;
        case "help":
          await handleHelp(message);
          break;
        default:
          // Unknown command — ignore silently
          break;
      }
    } catch (err) {
      logger.error({ err, command }, "Command handler error");
      try {
        await message.reply("❌  Something went wrong. Please try again.");
      } catch {}
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    try {
      await handleButtonInteraction(interaction as ButtonInteraction, client);
    } catch (err) {
      logger.error({ err }, "Interaction handler error");
      try {
        const i = interaction as ButtonInteraction;
        if (!i.replied && !i.deferred) {
          await i.reply({
            content: "❌  An error occurred. Please try again.",
            flags: 64,
          });
        }
      } catch {}
    }
  });

  void client.login(token);
}

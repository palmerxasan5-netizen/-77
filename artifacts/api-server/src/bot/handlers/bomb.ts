import type { Message, TextChannel } from "discord.js";
import { hasGame, setGame } from "../gameState.js";
import {
  buildLobbyEmbed,
  buildLobbyButtons,
} from "../embeds.js";
import type { GameState } from "../types.js";

const MAX_PLAYERS = 13;

export async function handleBomb(message: Message): Promise<void> {
  const channelId = message.channelId;

  if (hasGame(channelId)) {
    await message.reply("❌  Ciyaar ayaa horay u socota channel-kan! Sug ay dhammaato.");
    return;
  }

  const hostId = message.author.id;
  const hostTag = message.author.displayName;

  const game: GameState = {
    channelId,
    messageId: "",
    hostId,
    players: [],
    phase: "lobby",
    tiles: [],
    bombCount: 0,
    tileCount: 0,
    prizePool: 0,
    currentPlayerIndex: 0,
    turnTimer: null,
    activePlayers: [],
    finalTwoChosen: {},
    turnStartedAt: Date.now(),
    turnEndsAt: 0,
  };

  const lobbyMsg = await (message.channel as TextChannel).send({
    embeds: [buildLobbyEmbed([], MAX_PLAYERS, hostTag)],
    components: [buildLobbyButtons()],
  });

  game.messageId = lobbyMsg.id;
  setGame(channelId, game);
}

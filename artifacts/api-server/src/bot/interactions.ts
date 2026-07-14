import {
  type ButtonInteraction,
  type Client,
  type TextChannel,
  type NewsChannel,
  type TextBasedChannel,
} from "discord.js";
import {
  getGame,
  setGame,
  deleteGame,
  getTileConfig,
  buildTiles,
} from "./gameState.js";
import {
  buildLobbyEmbed,
  buildLobbyButtons,
  buildBetButtons,
  buildGameStartEmbed,
  buildGameBoardEmbed,
  buildTileButtons,
  buildBombHitEmbed,
  buildSafeEmbed,
  buildFinalTwoEmbed,
  buildFinalTwoButtons,
  buildWinnerEmbed,
  buildTimeoutEmbed,
  buildDisabledTileButtons,
  disabledLobbyButtons,
} from "./embeds.js";
import { addBalance, getBalance } from "./store.js";
import { logger } from "../lib/logger.js";
import type { GameState } from "./types.js";

const MAX_PLAYERS = 13;
const TURN_TIMEOUT_MS = 10_000;

/** Narrow a TextBasedChannel to one that actually has send() */
type SendableChannel = TextChannel | NewsChannel;

function asSendable(ch: unknown): SendableChannel | null {
  if (!ch) return null;
  const c = ch as Record<string, unknown>;
  if (typeof c["send"] === "function") return ch as SendableChannel;
  return null;
}

// ─── Button Router ────────────────────────────────────────────────────────────

export async function handleButtonInteraction(
  interaction: ButtonInteraction,
  client: Client
): Promise<void> {
  const id = interaction.customId;

  if (id === "join_game") return handleJoin(interaction);
  if (id === "leave_game") return handleLeave(interaction);
  if (id === "start_game") return handleStart(interaction, client);
  if (id === "stop_game") return handleStop(interaction);
  if (id.startsWith("bet_")) return handleBet(interaction, client);
  if (id.startsWith("tile_") && !id.endsWith("_done"))
    return handleTile(interaction, client);
  if (id === "final_bomb" || id === "final_safe")
    return handleFinalChoice(interaction, client);

  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({
      content: "❌  This button is no longer active.",
      flags: 64,
    });
  }
}

// ─── Join ─────────────────────────────────────────────────────────────────────

async function handleJoin(interaction: ButtonInteraction): Promise<void> {
  const channelId = interaction.channelId;
  const game = getGame(channelId);

  if (!game || game.phase !== "lobby") {
    await interaction.reply({ content: "❌  No active lobby in this channel.", flags: 64 });
    return;
  }
  if (game.players.find((p) => p.userId === interaction.user.id)) {
    await interaction.reply({ content: "❌  You're already in the lobby!", flags: 64 });
    return;
  }
  if (game.players.length >= MAX_PLAYERS) {
    await interaction.reply({ content: "❌  The lobby is full (13 players max).", flags: 64 });
    return;
  }

  await interaction.reply({
    content: "💰  **Choose your bet to enter the game:**",
    components: buildBetButtons(),
    flags: 64,
  });
}

// ─── Bet ──────────────────────────────────────────────────────────────────────

async function handleBet(
  interaction: ButtonInteraction,
  _client: Client
): Promise<void> {
  const channelId = interaction.channelId;
  const game = getGame(channelId);

  if (!game || game.phase !== "lobby") {
    await interaction.reply({ content: "❌  No active lobby.", flags: 64 });
    return;
  }
  if (game.players.find((p) => p.userId === interaction.user.id)) {
    await interaction.reply({ content: "❌  You're already in the game!", flags: 64 });
    return;
  }

  const bet = parseInt(interaction.customId.replace("bet_", ""), 10);
  const balance = getBalance(interaction.user.id);

  if (balance < bet) {
    await interaction.reply({
      content: `❌  You don't have enough money. Your balance: **$${balance.toLocaleString()}**`,
      flags: 64,
    });
    return;
  }

  addBalance(interaction.user.id, -bet);
  game.players.push({
    userId: interaction.user.id,
    username: interaction.user.username,
    displayName: interaction.user.displayName,
    bet,
  });
  game.prizePool += bet;
  setGame(channelId, game);

  await interaction.reply({
    content: `✅  You've joined with a **${bet.toLocaleString()}** bet! Good luck 🍀`,
    flags: 64,
  });

  // interaction.message here is the ephemeral bet message — fetch the real lobby message directly
  await updateLobbyMessageById(interaction, game);
}

// ─── Leave ────────────────────────────────────────────────────────────────────

async function handleLeave(interaction: ButtonInteraction): Promise<void> {
  const channelId = interaction.channelId;
  const game = getGame(channelId);

  if (!game || game.phase !== "lobby") {
    await interaction.reply({ content: "❌  No active lobby.", flags: 64 });
    return;
  }

  const idx = game.players.findIndex((p) => p.userId === interaction.user.id);
  if (idx === -1) {
    await interaction.reply({ content: "❌  You're not in this lobby.", flags: 64 });
    return;
  }

  const player = game.players[idx]!;
  addBalance(interaction.user.id, player.bet);
  game.prizePool -= player.bet;
  game.players.splice(idx, 1);
  setGame(channelId, game);

  await interaction.reply({
    content: `✅  You left the lobby. **${player.bet.toLocaleString()}** refunded.`,
    flags: 64,
  });

  // interaction.message is the lobby message for Leave button — update it directly
  await updateLobbyMessageById(interaction, game);
}

// ─── Stop ─────────────────────────────────────────────────────────────────────

async function handleStop(interaction: ButtonInteraction): Promise<void> {
  const channelId = interaction.channelId;
  const game = getGame(channelId);

  if (!game) {
    await interaction.reply({ content: "❌  No active game.", flags: 64 });
    return;
  }
  if (interaction.user.id !== game.hostId) {
    await interaction.reply({ content: "❌  Only the host can cancel the game.", flags: 64 });
    return;
  }

  for (const p of game.players) addBalance(p.userId, p.bet);
  deleteGame(channelId);

  await interaction.update({
    embeds: [
      {
        title: "⛔  Game Cancelled",
        description: "The host cancelled the game. All bets have been refunded.",
        color: 0xff2222,
      },
    ],
    components: [],
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

async function handleStart(
  interaction: ButtonInteraction,
  client: Client
): Promise<void> {
  const channelId = interaction.channelId;
  const game = getGame(channelId);

  if (!game || game.phase !== "lobby") {
    await interaction.reply({ content: "❌  No active lobby.", flags: 64 });
    return;
  }
  if (interaction.user.id !== game.hostId) {
    await interaction.reply({ content: "❌  Only the host can start the game.", flags: 64 });
    return;
  }
  if (game.players.length < 2) {
    await interaction.reply({ content: "❌  Need at least **2 players** to start!", flags: 64 });
    return;
  }

  const shuffled = [...game.players].sort(() => Math.random() - 0.5);
  game.players = shuffled;
  game.activePlayers = shuffled.map((p) => p.userId);

  const { tileCount, bombCount } = getTileConfig(game.players.length);
  game.tileCount = tileCount;
  game.bombCount = bombCount;
  game.tiles = buildTiles(tileCount, bombCount);
  game.phase = "playing";
  game.currentPlayerIndex = 0;

  setGame(channelId, game);

  await interaction.update({
    embeds: [buildGameStartEmbed(game)],
    components: [disabledLobbyButtons()],
  });

  const rawChannel = interaction.channel;
  const channel = asSendable(rawChannel);
  if (!channel) return;

  const boardMsg = await channel.send({
    embeds: [buildGameBoardEmbed(game)],
    components: buildTileButtons(game),
  });

  game.messageId = boardMsg.id;
  setGame(channelId, game);

  startTurnTimer(channelId, client, boardMsg.id);
}

// ─── Tile Pick ────────────────────────────────────────────────────────────────

async function handleTile(
  interaction: ButtonInteraction,
  client: Client
): Promise<void> {
  const channelId = interaction.channelId;
  const game = getGame(channelId);

  if (!game || game.phase !== "playing") {
    await interaction.reply({ content: "❌  No active game.", flags: 64 });
    return;
  }

  const currentPlayerId = game.activePlayers[game.currentPlayerIndex];
  if (interaction.user.id !== currentPlayerId) {
    await interaction.reply({ content: "❌  It's not your turn!", flags: 64 });
    return;
  }

  const tileIndex = parseInt(interaction.customId.replace("tile_", ""), 10);
  const tile = game.tiles[tileIndex];
  if (!tile || tile.revealed) {
    await interaction.reply({ content: "❌  That tile is already revealed.", flags: 64 });
    return;
  }

  if (game.turnTimer) {
    clearTimeout(game.turnTimer);
    game.turnTimer = null;
  }

  await interaction.deferUpdate();
  await revealTile(channelId, tileIndex, client);
}

// ─── Core: Reveal Tile ────────────────────────────────────────────────────────

export async function revealTile(
  channelId: string,
  tileIndex: number,
  client: Client
): Promise<void> {
  const game = getGame(channelId);
  if (!game) return;

  const tile = game.tiles[tileIndex];
  if (!tile) return;

  tile.revealed = true;
  const currentPlayerId = game.activePlayers[game.currentPlayerIndex]!;
  const currentPlayer = game.players.find((p) => p.userId === currentPlayerId)!;

  const rawChannel = client.channels.cache.get(channelId);
  const channel = asSendable(rawChannel);
  if (!channel) return;

  if (tile.isBomb) {
    game.activePlayers.splice(game.currentPlayerIndex, 1);
    if (game.currentPlayerIndex >= game.activePlayers.length) {
      game.currentPlayerIndex = 0;
    }
    setGame(channelId, game);

    await channel.send({ embeds: [buildBombHitEmbed(currentPlayer.displayName, game)] });

    if (game.activePlayers.length === 1) {
      await endGame(channelId, client);
      return;
    }

    if (game.activePlayers.length === 2) {
      const foundBombs = game.tiles.filter((t) => t.isBomb && t.revealed).length;
      if (foundBombs >= game.bombCount) {
        await startFinalShowdown(channelId, client);
        return;
      }
    }

    await updateBoardMessage(channelId, client);
    startTurnTimer(channelId, client, game.messageId);
  } else {
    await channel.send({ embeds: [buildSafeEmbed(currentPlayer.displayName)] });

    game.currentPlayerIndex =
      (game.currentPlayerIndex + 1) % game.activePlayers.length;

    const hiddenSafe = game.tiles.filter((t) => !t.revealed && !t.isBomb).length;

    setGame(channelId, game);

    if (hiddenSafe === 0 && game.activePlayers.length > 1) {
      await startFinalShowdown(channelId, client);
      return;
    }

    await updateBoardMessage(channelId, client);
    startTurnTimer(channelId, client, game.messageId);
  }
}

// ─── Turn Timer ───────────────────────────────────────────────────────────────

function startTurnTimer(
  channelId: string,
  client: Client,
  _boardMsgId: string
): void {
  const game = getGame(channelId);
  if (!game || game.phase !== "playing") return;
  if (game.turnTimer) clearTimeout(game.turnTimer);

  game.turnTimer = setTimeout(async () => {
    const g = getGame(channelId);
    if (!g || g.phase !== "playing") return;

    const hidden = g.tiles.filter((t) => !t.revealed);
    if (hidden.length === 0) return;
    const picked = hidden[Math.floor(Math.random() * hidden.length)]!;

    const currentPlayerId = g.activePlayers[g.currentPlayerIndex]!;
    const currentPlayer = g.players.find((p) => p.userId === currentPlayerId)!;

    const ch = asSendable(client.channels.cache.get(channelId));
    if (ch) {
      await ch.send({ embeds: [buildTimeoutEmbed(currentPlayer.displayName)] });
    }

    await revealTile(channelId, picked.index, client);
  }, TURN_TIMEOUT_MS);

  setGame(channelId, game);
}

// ─── Update Board Message ─────────────────────────────────────────────────────

async function updateBoardMessage(channelId: string, client: Client): Promise<void> {
  const game = getGame(channelId);
  if (!game) return;

  const ch = asSendable(client.channels.cache.get(channelId));
  if (!ch) return;

  try {
    const msg = await ch.messages.fetch(game.messageId);
    await msg.edit({
      embeds: [buildGameBoardEmbed(game)],
      components: buildTileButtons(game),
    });
  } catch (e) {
    logger.error({ e }, "Failed to update board message");
  }
}

// ─── Final Two Showdown ───────────────────────────────────────────────────────

async function startFinalShowdown(channelId: string, client: Client): Promise<void> {
  const game = getGame(channelId);
  if (!game) return;

  game.phase = "final_two";
  game.finalTwoChosen = {};
  setGame(channelId, game);

  const ch = asSendable(client.channels.cache.get(channelId));
  if (!ch) return;

  try {
    const msg = await ch.messages.fetch(game.messageId);
    await msg.edit({
      embeds: [buildGameBoardEmbed(game)],
      components: buildDisabledTileButtons(game),
    });
  } catch {}

  const finalMsg = await ch.send({
    embeds: [buildFinalTwoEmbed(game)],
    components: [buildFinalTwoButtons()],
  });

  game.messageId = finalMsg.id;
  setGame(channelId, game);
}

async function handleFinalChoice(
  interaction: ButtonInteraction,
  client: Client
): Promise<void> {
  const channelId = interaction.channelId;
  const game = getGame(channelId);

  if (!game || game.phase !== "final_two") {
    await interaction.reply({ content: "❌  No showdown active.", flags: 64 });
    return;
  }
  if (!game.activePlayers.includes(interaction.user.id)) {
    await interaction.reply({ content: "❌  You're not in the final showdown.", flags: 64 });
    return;
  }
  if (game.finalTwoChosen[interaction.user.id]) {
    await interaction.reply({ content: "❌  You already made your choice!", flags: 64 });
    return;
  }

  const choice = interaction.customId === "final_bomb" ? "bomb" : "safe";
  game.finalTwoChosen[interaction.user.id] = choice;
  setGame(channelId, game);

  await interaction.reply({
    content: `You chose **${choice === "bomb" ? "💣 Bomb" : "🟢 Safe"}**!`,
    flags: 64,
  });

  const [p1id, p2id] = game.activePlayers as [string, string];
  const chooserId = interaction.user.id;
  const otherId = chooserId === p1id ? p2id : p1id;

  if (choice === "bomb") {
    game.activePlayers = [otherId];
  } else {
    game.activePlayers = [chooserId];
  }
  setGame(channelId, game);

  await interaction.message?.edit({ components: [] }).catch(() => {});

  const ch = asSendable(client.channels.cache.get(channelId));
  if (ch) {
    const loserId = choice === "bomb" ? chooserId : otherId;
    const loser = game.players.find((p) => p.userId === loserId);
    if (loser) {
      await ch.send({
        embeds: [
          {
            title: "💣  BOOM!",
            description: `**${loser.displayName}** chose the bomb and is eliminated!`,
            color: 0xff2222,
          },
        ],
      });
    }
  }

  await endGame(channelId, client);
}

// ─── End Game ─────────────────────────────────────────────────────────────────

async function endGame(channelId: string, client: Client): Promise<void> {
  const game = getGame(channelId);
  if (!game) return;

  game.phase = "ended";
  setGame(channelId, game);

  const winnerId = game.activePlayers[0];
  if (!winnerId) {
    deleteGame(channelId);
    return;
  }

  const winner = game.players.find((p) => p.userId === winnerId)!;
  addBalance(winnerId, game.prizePool);

  const ch = asSendable(client.channels.cache.get(channelId));
  if (ch) {
    await ch.send({ embeds: [buildWinnerEmbed(winner.displayName, game.prizePool)] });
    try {
      const msg = await ch.messages.fetch(game.messageId);
      await msg.edit({ components: [] });
    } catch {}
  }

  deleteGame(channelId);
}

// ─── Lobby Helpers ────────────────────────────────────────────────────────────

/** Fetch the real lobby message by its saved ID and update it. */
async function updateLobbyMessageById(
  interaction: ButtonInteraction,
  game: GameState
): Promise<void> {
  try {
    const ch = asSendable(interaction.channel);
    if (!ch) return;
    const msg = await ch.messages.fetch(game.messageId);
    await msg.edit({
      embeds: [buildLobbyEmbed(game.players, MAX_PLAYERS, `<@${game.hostId}>`)],
      components: [buildLobbyButtons(game.hostId)],
    });
  } catch (e) {
    logger.error({ e }, "Failed to update lobby message");
  }
}

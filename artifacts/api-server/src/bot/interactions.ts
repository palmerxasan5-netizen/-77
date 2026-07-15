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
  buildGameBoardEmbed,
  buildTileButtons,
  buildFinalTwoEmbed,
  buildFinalTwoButtons,
  buildWinnerEmbed,
  disabledLobbyButtons,
} from "./embeds.js";
import { addBalance, getBalance } from "./store.js";
import { logger } from "../lib/logger.js";
import type { GameState } from "./types.js";

const MAX_PLAYERS     = 13;
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

  if (id === "join_game")  return handleJoin(interaction);
  if (id === "leave_game") return handleLeave(interaction);
  if (id === "start_game") return handleStart(interaction, client);
  if (id === "stop_game")  return handleStop(interaction);
  if (id.startsWith("bet_"))  return handleBet(interaction, client);
  if (id.startsWith("tile_") && !id.endsWith("_done"))
    return handleTile(interaction, client);
  if (id === "final_bomb" || id === "final_safe")
    return handleFinalChoice(interaction, client);

  // Disabled/header buttons — silently ignore
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({ content: "❌  Batankan ma shaqeynayso.", flags: 64 });
  }
}

// ─── Join ─────────────────────────────────────────────────────────────────────

async function handleJoin(interaction: ButtonInteraction): Promise<void> {
  const channelId = interaction.channelId;
  const game = getGame(channelId);

  if (!game || game.phase !== "lobby") {
    await interaction.reply({ content: "❌  Lobby ma jirto channel-kan.", flags: 64 });
    return;
  }
  if (game.players.find((p) => p.userId === interaction.user.id)) {
    await interaction.reply({ content: "❌  Horay ayaad ugu jirtay lobby-ga!", flags: 64 });
    return;
  }
  if (game.players.length >= MAX_PLAYERS) {
    await interaction.reply({ content: "❌  Lobby-ga waxa ka buuxay (13 ciyaartooy).", flags: 64 });
    return;
  }

  await interaction.reply({
    content: "💰  **Dooro lacagta aad doonayso in aad ku biirtid:**",
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
    await interaction.reply({ content: "❌  Lobby ma jirto.", flags: 64 });
    return;
  }
  if (game.players.find((p) => p.userId === interaction.user.id)) {
    await interaction.reply({ content: "❌  Horay ayaad ugu jirtay ciyaarta!", flags: 64 });
    return;
  }

  const bet     = parseInt(interaction.customId.replace("bet_", ""), 10);
  const balance = getBalance(interaction.user.id);

  if (balance === 0) {
    await interaction.reply({
      content: `💸  Lacagtaadu waxay tahay **$0** — fadlan lacag ku shubo!`,
      flags: 64,
    });
    return;
  }

  if (balance < bet) {
    await interaction.reply({
      content: `❌  Lacag kuma filna. Xisaabtaada: **${balance.toLocaleString()}**`,
      flags: 64,
    });
    return;
  }

  addBalance(interaction.user.id, -bet);
  game.players.push({
    userId:      interaction.user.id,
    username:    interaction.user.username,
    displayName: interaction.user.displayName,
    bet,
  });
  game.prizePool += bet;
  setGame(channelId, game);

  await interaction.reply({
    content: `✅  Waxaad ku biiratay **$${bet.toLocaleString()}** ! Nasiib wanaagsan 🍀`,
    flags: 64,
  });

  // Fetch and update the real lobby message (interaction.message = ephemeral bet msg)
  await updateLobbyMessageById(interaction, game);
}

// ─── Leave ────────────────────────────────────────────────────────────────────

async function handleLeave(interaction: ButtonInteraction): Promise<void> {
  const channelId = interaction.channelId;
  const game = getGame(channelId);

  if (!game || game.phase !== "lobby") {
    await interaction.reply({ content: "❌  Lobby ma jirto.", flags: 64 });
    return;
  }

  const idx = game.players.findIndex((p) => p.userId === interaction.user.id);
  if (idx === -1) {
    await interaction.reply({ content: "❌  Lobby-ga kuma jirtid.", flags: 64 });
    return;
  }

  const player = game.players[idx]!;
  addBalance(interaction.user.id, player.bet);
  game.prizePool -= player.bet;
  game.players.splice(idx, 1);
  setGame(channelId, game);

  await interaction.reply({
    content: `✅  Lobby-ga baad ka baxday. **$${player.bet.toLocaleString()}** laguu celiyay.`,
    flags: 64,
  });

  await updateLobbyMessageById(interaction, game);
}

// ─── Stop ─────────────────────────────────────────────────────────────────────

async function handleStop(interaction: ButtonInteraction): Promise<void> {
  const channelId = interaction.channelId;
  const game = getGame(channelId);

  if (!game) {
    await interaction.reply({ content: "❌  Ciyaar ma jirto.", flags: 64 });
    return;
  }
  if (interaction.user.id !== game.hostId) {
    await interaction.reply({ content: "❌  Host kaliya ayaa joojin kara.", flags: 64 });
    return;
  }

  for (const p of game.players) addBalance(p.userId, p.bet);
  deleteGame(channelId);

  await interaction.update({
    embeds: [
      {
        title:       "⛔  Ciyaarta La Joojiyay",
        description: "Host-ku ciyaarta ayuu joojiyay. Lacagtii la celiyay.",
        color:       0xff2222,
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
    await interaction.reply({ content: "❌  Lobby ma jirto.", flags: 64 });
    return;
  }
  if (interaction.user.id !== game.hostId) {
    await interaction.reply({ content: "❌  Host kaliya ayaa bilaabi kara.", flags: 64 });
    return;
  }
  if (game.players.length < 2) {
    await interaction.reply({ content: "❌  Ugu yaraan **2 ciyaartooy** ayaa loo baahan yahay!", flags: 64 });
    return;
  }

  const shuffled = [...game.players].sort(() => Math.random() - 0.5);
  game.players       = shuffled;
  game.activePlayers = shuffled.map((p) => p.userId);

  const { tileCount, bombCount } = getTileConfig(game.players.length);
  game.tileCount          = tileCount;
  game.bombCount          = bombCount;
  game.tiles              = buildTiles(tileCount, bombCount);
  game.phase              = "playing";
  game.currentPlayerIndex = 0;
  game.turnEndsAt         = Date.now() + TURN_TIMEOUT_MS;
  setGame(channelId, game);

  // Edit the lobby message in-place → becomes the game board (ONE message throughout)
  await interaction.update({
    embeds:     [buildGameBoardEmbed(game, null)],
    components: buildTileButtons(game),
  });

  // game.messageId already points to this (lobby) message — keep it
  startTurnTimer(channelId, client);
}

// ─── Tile Pick ────────────────────────────────────────────────────────────────

async function handleTile(
  interaction: ButtonInteraction,
  client: Client
): Promise<void> {
  const channelId = interaction.channelId;
  const game = getGame(channelId);

  if (!game || game.phase !== "playing") {
    await interaction.reply({ content: "❌  Ciyaar firfircoon ma jirto.", flags: 64 });
    return;
  }

  const currentPlayerId = game.activePlayers[game.currentPlayerIndex];
  if (interaction.user.id !== currentPlayerId) {
    await interaction.reply({ content: "❌  Wareegaagu ma aha!", flags: 64 });
    return;
  }

  const tileIndex = parseInt(interaction.customId.replace("tile_", ""), 10);
  const tile      = game.tiles[tileIndex];
  if (!tile || tile.revealed) {
    await interaction.reply({ content: "❌  Tile-kaasi horay ayaa loo furay.", flags: 64 });
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
  client: Client,
  timedOut = false
): Promise<void> {
  const game = getGame(channelId);
  if (!game) return;

  const tile = game.tiles[tileIndex];
  if (!tile) return;

  tile.revealed = true;
  const currentPlayerId = game.activePlayers[game.currentPlayerIndex]!;
  const currentPlayer   = game.players.find((p) => p.userId === currentPlayerId)!;

  if (tile.isBomb) {
    // ── Bomb hit ───────────────────────────────────────────────────────────
    game.activePlayers.splice(game.currentPlayerIndex, 1);
    if (game.currentPlayerIndex >= game.activePlayers.length) {
      game.currentPlayerIndex = 0;
    }

    if (game.activePlayers.length === 1) {
      setGame(channelId, game);
      await endGame(channelId, client, "bomb");
      return;
    }

    const foundBombs = game.tiles.filter((t) => t.isBomb && t.revealed).length;
    if (game.activePlayers.length === 2 && foundBombs >= game.bombCount) {
      setGame(channelId, game);
      await startFinalShowdown(channelId, client, "bomb");
      return;
    }

    game.turnEndsAt = Date.now() + TURN_TIMEOUT_MS;
    setGame(channelId, game);
    await updateBoardMessage(channelId, client, "bomb");
    startTurnTimer(channelId, client);
  } else {
    // ── Safe tile ──────────────────────────────────────────────────────────
    game.currentPlayerIndex =
      (game.currentPlayerIndex + 1) % game.activePlayers.length;

    const hiddenSafe = game.tiles.filter((t) => !t.revealed && !t.isBomb).length;

    if (hiddenSafe === 0 && game.activePlayers.length > 1) {
      setGame(channelId, game);
      await startFinalShowdown(channelId, client, "safe");
      return;
    }

    game.turnEndsAt = Date.now() + TURN_TIMEOUT_MS;
    setGame(channelId, game);
    await updateBoardMessage(channelId, client, "safe");
    startTurnTimer(channelId, client);
  }
}

// ─── Turn Timer ───────────────────────────────────────────────────────────────

function startTurnTimer(channelId: string, client: Client): void {
  const game = getGame(channelId);
  if (!game || game.phase !== "playing") return;
  if (game.turnTimer) clearTimeout(game.turnTimer);

  game.turnTimer = setTimeout(async () => {
    const g = getGame(channelId);
    if (!g || g.phase !== "playing") return;

    const hidden = g.tiles.filter((t) => !t.revealed);
    if (hidden.length === 0) return;
    const picked = hidden[Math.floor(Math.random() * hidden.length)]!;

    await revealTile(channelId, picked.index, client, /* timedOut= */ true);
  }, TURN_TIMEOUT_MS);

  setGame(channelId, game);
}

// ─── Update Board Message ─────────────────────────────────────────────────────

async function updateBoardMessage(
  channelId: string,
  client: Client,
  lastResult?: "bomb" | "safe" | null
): Promise<void> {
  const game = getGame(channelId);
  if (!game) return;

  const ch = asSendable(client.channels.cache.get(channelId));
  if (!ch) return;

  try {
    const msg = await ch.messages.fetch(game.messageId);
    await msg.edit({
      embeds:     [buildGameBoardEmbed(game, lastResult)],
      components: buildTileButtons(game),
    });
  } catch (e) {
    logger.error({ e }, "Failed to update board message");
  }
}

// ─── Final Two Showdown ───────────────────────────────────────────────────────

async function startFinalShowdown(
  channelId: string,
  client: Client,
  lastResult?: "bomb" | "safe" | null
): Promise<void> {
  const game = getGame(channelId);
  if (!game) return;

  game.phase          = "final_two";
  game.finalTwoChosen = {};
  setGame(channelId, game);

  const ch = asSendable(client.channels.cache.get(channelId));
  if (!ch) return;

  try {
    const msg = await ch.messages.fetch(game.messageId);
    await msg.edit({
      embeds:     [buildFinalTwoEmbed(game, lastResult)],
      components: [buildFinalTwoButtons()],
    });
  } catch (e) {
    logger.error({ e }, "Failed to edit message for final showdown");
  }
}

async function handleFinalChoice(
  interaction: ButtonInteraction,
  client: Client
): Promise<void> {
  const channelId = interaction.channelId;
  const game      = getGame(channelId);

  if (!game || game.phase !== "final_two") {
    await interaction.reply({ content: "❌  Dagaal dambe ma jiro.", flags: 64 });
    return;
  }
  if (!game.activePlayers.includes(interaction.user.id)) {
    await interaction.reply({ content: "❌  Dagaalka dambe kuma jirtid.", flags: 64 });
    return;
  }
  if (game.finalTwoChosen[interaction.user.id]) {
    await interaction.reply({ content: "❌  Horay ayaad u dooratay!", flags: 64 });
    return;
  }

  const choice   = interaction.customId === "final_bomb" ? "bomb" : "safe";
  const chooser  = game.players.find((p) => p.userId === interaction.user.id)!;
  game.finalTwoChosen[interaction.user.id] = choice;

  const [p1id, p2id] = game.activePlayers as [string, string];
  const otherId = interaction.user.id === p1id ? p2id : p1id;

  if (choice === "bomb") {
    game.activePlayers = [otherId];
  } else {
    game.activePlayers = [interaction.user.id];
  }
  setGame(channelId, game);

  // Acknowledge the choice ephemerally, then immediately end game
  await interaction.reply({
    content: `Waxaad dooratay **${choice === "bomb" ? "💣 Dab" : "🟢 Badbaado"}**!`,
    flags: 64,
  });

  await endGame(channelId, client, "bomb");
}

// ─── End Game ─────────────────────────────────────────────────────────────────

async function endGame(
  channelId: string,
  client: Client,
  _lastResult?: "bomb" | "safe" | null
): Promise<void> {
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

  // Show winner by editing the single game message in-place (no balance shown)
  const ch = asSendable(client.channels.cache.get(channelId));
  if (ch) {
    try {
      const msg = await ch.messages.fetch(game.messageId);
      await msg.edit({
        embeds:     [buildWinnerEmbed(winner.displayName, game.prizePool)],
        components: [],
      });
    } catch (e) {
      logger.error({ e }, "Failed to edit message for game end");
    }
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
      embeds:     [buildLobbyEmbed(game.players, MAX_PLAYERS, `<@${game.hostId}>`)],
      components: [buildLobbyButtons()],
    });
  } catch (e) {
    logger.error({ e }, "Failed to update lobby message");
  }
}

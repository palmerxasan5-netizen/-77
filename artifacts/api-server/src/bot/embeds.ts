import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { GameState, LobbyPlayer } from "./types.js";

const BOMB_COLOR = 0xff2222;
const GOLD_COLOR = 0xffd700;
const GREEN_COLOR = 0x00c853;
const DARK_COLOR = 0x2b2d31;
const ORANGE_COLOR = 0xff6b00;

// ─── Lobby Embed ────────────────────────────────────────────────────────────

export function buildLobbyEmbed(
  players: LobbyPlayer[],
  maxPlayers: number,
  hostTag: string
): EmbedBuilder {
  const prizePool = players.reduce((s, p) => s + p.bet, 0);
  const playerLines =
    players.length === 0
      ? "*No players yet…*"
      : players
          .map((p) => `> 👤 **${p.displayName}** — 💵 $${p.bet.toLocaleString()}`)
          .join("\n");

  const lobbyImageUrl =
    process.env["LOBBY_IMAGE_URL"] ??
    "https://cdn.discordapp.com/attachments/1470820767204638742/1523824380075970670/IMG_6568.jpg";

  return new EmbedBuilder()
    .setTitle("💣  BOMB SURVIVAL")
    .setColor(BOMB_COLOR)
    .setDescription(
      `> *A game of luck, nerves, and explosions. One wrong tile and you're out!*\n\u200b`
    )
    .setImage(lobbyImageUrl)
    .addFields(
      {
        name: "👥 Players",
        value: `\`${players.length}/${maxPlayers}\``,
        inline: true,
      },
      {
        name: "💰 Prize Pool",
        value: `\`$${prizePool.toLocaleString()}\``,
        inline: true,
      },
      {
        name: "💣 Bombs",
        value: "`Random`",
        inline: true,
      },
      {
        name: "⏳ Status",
        value:
          players.length < 2
            ? "`Waiting for players…`"
            : "`Ready to start!`",
        inline: false,
      },
      {
        name: "\u200b",
        value: playerLines,
        inline: false,
      }
    )
    .setFooter({ text: `Host: ${hostTag} • Min 2 players required` })
    .setTimestamp();
}

export function buildLobbyButtons(
  hostId: string,
  interactorId?: string
): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("join_game")
      .setLabel("Join")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("leave_game")
      .setLabel("Leave")
      .setEmoji("🚪")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("start_game")
      .setLabel("Start Now")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("stop_game")
      .setLabel("Cancel")
      .setEmoji("⛔")
      .setStyle(ButtonStyle.Danger)
  );
  return row;
}

export function buildBetButtons(): ActionRowBuilder<ButtonBuilder>[] {
  const bets = [500, 1000, 2000, 3000, 4000, 5000];
  // Discord max 5 buttons per row — split 6 bets into two rows (3 + 3)
  const row1 = new ActionRowBuilder<ButtonBuilder>();
  const row2 = new ActionRowBuilder<ButtonBuilder>();
  bets.forEach((b, i) => {
    const btn = new ButtonBuilder()
      .setCustomId(`bet_${b}`)
      .setLabel(`${b.toLocaleString()}`)
      .setEmoji("💵")
      .setStyle(ButtonStyle.Secondary);
    if (i < 3) row1.addComponents(btn);
    else row2.addComponents(btn);
  });
  return [row1, row2];
}

// ─── Game Start Embed ────────────────────────────────────────────────────────

export function buildGameStartEmbed(game: GameState): EmbedBuilder {
  const playerList = game.players
    .map((p) => `> 👤 **${p.displayName}** — $${p.bet.toLocaleString()}`)
    .join("\n");

  return new EmbedBuilder()
    .setTitle("💣  BOMB SURVIVAL  —  STARTED!")
    .setColor(ORANGE_COLOR)
    .setDescription(
      `The bombs are hidden. Choose your tiles wisely.\n\n${playerList}`
    )
    .addFields(
      {
        name: "👥 Players",
        value: `\`${game.players.length}\``,
        inline: true,
      },
      {
        name: "💰 Prize Pool",
        value: `\`$${game.prizePool.toLocaleString()}\``,
        inline: true,
      },
      {
        name: "💣 Bombs",
        value: `\`${game.bombCount}\``,
        inline: true,
      },
      {
        name: "\u200b",
        value: "🍀  **Good Luck Everyone!**",
        inline: false,
      }
    )
    .setTimestamp();
}

// ─── Game Board Embed ────────────────────────────────────────────────────────

export function buildGameBoardEmbed(game: GameState): EmbedBuilder {
  const currentPlayerId = game.activePlayers[game.currentPlayerIndex];
  const currentPlayer = game.players.find((p) => p.userId === currentPlayerId);
  const remaining = game.activePlayers.length;
  const foundBombs = game.tiles.filter((t) => t.revealed && t.isBomb).length;
  const bombsLeft = game.bombCount - foundBombs;

  const playerStatusLines = game.activePlayers.map((uid, i) => {
    const p = game.players.find((x) => x.userId === uid)!;
    const arrow = i === game.currentPlayerIndex ? "▶️" : "⬛";
    return `${arrow} **${p.displayName}**`;
  });

  return new EmbedBuilder()
    .setTitle("💣  BOMB SURVIVAL  —  IN PROGRESS")
    .setColor(DARK_COLOR)
    .addFields(
      {
        name: "👥 Players Remaining",
        value: `\`${remaining}\``,
        inline: true,
      },
      {
        name: "💰 Prize Pool",
        value: `\`$${game.prizePool.toLocaleString()}\``,
        inline: true,
      },
      {
        name: "💣 Bombs Hidden",
        value: `\`${bombsLeft} left\``,
        inline: true,
      },
      {
        name: "⏳ Current Turn",
        value: currentPlayer
          ? `**${currentPlayer.displayName}** — pick a tile! *(10s)*`
          : "—",
        inline: false,
      },
      {
        name: "🎮 Players",
        value: playerStatusLines.join("\n") || "—",
        inline: false,
      }
    )
    .setFooter({
      text: "Click a tile! If time runs out the bot picks for you.",
    })
    .setTimestamp();
}

export function buildTileButtons(
  game: GameState
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const tiles = game.tiles;
  const COLS = 5;

  for (let i = 0; i < tiles.length; i += COLS) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    const chunk = tiles.slice(i, i + COLS);
    for (const tile of chunk) {
      const btn = new ButtonBuilder().setCustomId(`tile_${tile.index}`);
      if (!tile.revealed) {
        btn
          .setLabel("❓")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(false);
      } else if (tile.isBomb) {
        btn
          .setLabel("💣")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true);
      } else {
        btn
          .setLabel("✅")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true);
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }
  return rows;
}

// ─── Bomb Hit Embed ──────────────────────────────────────────────────────────

export function buildBombHitEmbed(
  playerName: string,
  game: GameState
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("💥  BOOM!")
    .setColor(BOMB_COLOR)
    .setDescription(
      `**${playerName}** hit a bomb and has been eliminated!\n\n💣 **${game.activePlayers.length} players** remaining.`
    )
    .setTimestamp();
}

// ─── Safe Tile Embed ─────────────────────────────────────────────────────────

export function buildSafeEmbed(playerName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("✅  SAFE!")
    .setColor(GREEN_COLOR)
    .setDescription(`**${playerName}** survived! Turn passes to the next player.`)
    .setTimestamp();
}

// ─── Final Two Embed ─────────────────────────────────────────────────────────

export function buildFinalTwoEmbed(game: GameState): EmbedBuilder {
  const [p1id, p2id] = game.activePlayers;
  const p1 = game.players.find((p) => p.userId === p1id);
  const p2 = game.players.find((p) => p.userId === p2id);

  return new EmbedBuilder()
    .setTitle("⚡  FINAL SHOWDOWN — 2 Players Left!")
    .setColor(GOLD_COLOR)
    .setDescription(
      `It comes down to **${p1?.displayName}** vs **${p2?.displayName}**!\n\n` +
        `Each player must choose: 💣 **Bomb** or 🟢 **Safe**.\n` +
        `Whoever clicks first decides their fate. Choose wisely!`
    )
    .addFields({
      name: "💰 Prize Pool",
      value: `\`$${game.prizePool.toLocaleString()}\``,
      inline: true,
    })
    .setTimestamp();
}

export function buildFinalTwoButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("final_bomb")
      .setLabel("Bomb")
      .setEmoji("💣")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("final_safe")
      .setLabel("Safe")
      .setEmoji("🟢")
      .setStyle(ButtonStyle.Success)
  );
}

// ─── Winner Embed ────────────────────────────────────────────────────────────

export function buildWinnerEmbed(
  winnerName: string,
  prize: number
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("🏆  WINNER!")
    .setColor(GOLD_COLOR)
    .setDescription(
      `> 👑  **${winnerName}**\n> 🏆  *Last Survivor*\n\n` +
        `💰  **Prize Won: $${prize.toLocaleString()}**\n\n` +
        `**Congratulations!** 🎉`
    )
    .setTimestamp();
}

// ─── Timeout Embed ───────────────────────────────────────────────────────────

export function buildTimeoutEmbed(playerName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("⏰  Time's Up!")
    .setColor(ORANGE_COLOR)
    .setDescription(
      `**${playerName}** didn't pick in time — the bot chose a random tile!`
    )
    .setTimestamp();
}

// ─── Disabled Board (game over) ──────────────────────────────────────────────

export function buildDisabledTileButtons(
  game: GameState
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const COLS = 5;
  for (let i = 0; i < game.tiles.length; i += COLS) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const tile of game.tiles.slice(i, i + COLS)) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`tile_${tile.index}_done`)
          .setLabel(tile.revealed ? (tile.isBomb ? "💣" : "✅") : "❓")
          .setStyle(
            tile.revealed
              ? tile.isBomb
                ? ButtonStyle.Danger
                : ButtonStyle.Success
              : ButtonStyle.Secondary
          )
          .setDisabled(true)
      );
    }
    rows.push(row);
  }
  return rows;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function disabledLobbyButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("join_game_d")
      .setLabel("Join")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("leave_game_d")
      .setLabel("Leave")
      .setEmoji("🚪")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("start_game_d")
      .setLabel("Start Now")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("stop_game_d")
      .setLabel("Cancel")
      .setEmoji("⛔")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true)
  );
}

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { GameState, LobbyPlayer } from "./types.js";

const BOMB_COLOR  = 0xff2222;
const GOLD_COLOR  = 0xffd700;
const GREEN_COLOR = 0x00c853;
const DARK_COLOR  = 0x2b2d31;

// ─── Lobby Embed ────────────────────────────────────────────────────────────

export function buildLobbyEmbed(
  players: LobbyPlayer[],
  maxPlayers: number,
  hostTag: string
): EmbedBuilder {
  const prizePool = players.reduce((s, p) => s + p.bet, 0);
  const playerLines =
    players.length === 0
      ? "*Wali qof kuma biirin…*"
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
      `> *Ciyaar nasiib, xoog iyo qarax. Sawir qaldan oo keliya ayaa kaa saari karta!*\n\u200b`
    )
    .setImage(lobbyImageUrl)
    .addFields(
      {
        name: "👥 Ciyaartoyda",
        value: `\`${players.length}/${maxPlayers}\``,
        inline: true,
      },
      {
        name: "💰 Abaalmarinta",
        value: `\`$${prizePool.toLocaleString()}\``,
        inline: true,
      },
      {
        name: "💣 Dabab",
        value: "`Random`",
        inline: true,
      },
      {
        name: "⏳ Xaaladda",
        value:
          players.length < 2
            ? "`Sugaya ciyaartoyda…`"
            : "`Diyaar bilow!`",
        inline: false,
      },
      {
        name: "\u200b",
        value: playerLines,
        inline: false,
      }
    )
    .setFooter({ text: `Host: ${hostTag} • Ugu yaraan 2 ciyaartooy ayaa loo baahan yahay` })
    .setTimestamp();
}

export function buildLobbyButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("join_game")
      .setLabel("Ku biir")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("leave_game")
      .setLabel("Ka bax")
      .setEmoji("🚪")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("start_game")
      .setLabel("Bilaab hadda")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("stop_game")
      .setLabel("Jooji")
      .setEmoji("⛔")
      .setStyle(ButtonStyle.Danger)
  );
}

export function buildBetButtons(): ActionRowBuilder<ButtonBuilder>[] {
  const bets = [500, 1_000, 2_000, 3_000, 4_000, 5_000];
  // Discord max 5 buttons per row — split 6 bets into two rows (3 + 3)
  const row1 = new ActionRowBuilder<ButtonBuilder>();
  const row2 = new ActionRowBuilder<ButtonBuilder>();
  bets.forEach((b, i) => {
    const btn = new ButtonBuilder()
      .setCustomId(`bet_${b}`)
      .setLabel(`$${b.toLocaleString()}`)
      .setEmoji("💵")
      .setStyle(ButtonStyle.Secondary);
    if (i < 3) row1.addComponents(btn);
    else row2.addComponents(btn);
  });
  return [row1, row2];
}

// ─── Game Board Embed (the ONE embed used throughout the whole game) ──────────
//
// lastActionText: e.g. "✅ Ahmed badbaday!" or "💥 Mohamed dab buu ku dhacay!"
// turnEndsAt is read from game.turnEndsAt (ms unix timestamp)

export function buildGameBoardEmbed(
  game: GameState,
  lastActionText?: string
): EmbedBuilder {
  const currentPlayerId = game.activePlayers[game.currentPlayerIndex];
  const currentPlayer   = game.players.find((p) => p.userId === currentPlayerId);
  const nextIndex       = (game.currentPlayerIndex + 1) % game.activePlayers.length;
  const nextPlayerId    = game.activePlayers[nextIndex];
  const nextPlayer      = game.activePlayers.length > 1
    ? game.players.find((p) => p.userId === nextPlayerId)
    : null;

  const remaining  = game.activePlayers.length;
  const foundBombs = game.tiles.filter((t) => t.revealed && t.isBomb).length;
  const bombsLeft  = game.bombCount - foundBombs;

  // Discord auto-updating countdown: <t:UNIX_SECONDS:R>
  const countdownStr = game.turnEndsAt
    ? `<t:${Math.floor(game.turnEndsAt / 1_000)}:R>`
    : "";

  // Description: last result + whose turn it is
  let desc = "";
  if (lastActionText) desc += `${lastActionText}\n\n`;
  if (currentPlayer) {
    desc += `🎯 **${currentPlayer.displayName}** — Doorso tile!\n`;
    if (countdownStr) desc += `⏱️ Dhamaadka: ${countdownStr}`;
    if (nextPlayer) desc += `\n➡️ Xiga: **${nextPlayer.displayName}**`;
  }

  // Player list: ▶️ = current turn, ⬛ = waiting
  const playerLines = game.activePlayers.map((uid, i) => {
    const p     = game.players.find((x) => x.userId === uid)!;
    const arrow = i === game.currentPlayerIndex ? "▶️" : "⬛";
    return `${arrow} **${p.displayName}** — $${p.bet.toLocaleString()}`;
  });

  return new EmbedBuilder()
    .setTitle("💣  BOMB SURVIVAL")
    .setColor(DARK_COLOR)
    .setDescription(desc || "\u200b")
    .addFields(
      {
        name: "👥 Ciyaartoyda",
        value: `\`${remaining} badbaaday\``,
        inline: true,
      },
      {
        name: "💰 Abaalmarinta",
        value: `\`$${game.prizePool.toLocaleString()}\``,
        inline: true,
      },
      {
        name: "💣 Dabab",
        value: `\`${bombsLeft} badbaaday\``,
        inline: true,
      },
      {
        name: "🎮 Ciyaartoyda",
        value: playerLines.join("\n") || "—",
        inline: false,
      }
    )
    .setFooter({ text: "Doorso tile! Haddaadan doorsan bot ayaa kuu doorta." })
    .setTimestamp();
}

// ─── Tile Buttons (with current-player header row) ────────────────────────────

export function buildTileButtons(
  game: GameState
): ActionRowBuilder<ButtonBuilder>[] {
  const currentPlayerId = game.activePlayers[game.currentPlayerIndex];
  const currentPlayer   = game.players.find((p) => p.userId === currentPlayerId);

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const COLS = 5;

  // Header row — shows whose turn it is (disabled, acts as a label)
  const headerRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("turn_header")
      .setLabel(
        currentPlayer
          ? `🎯 ${currentPlayer.displayName} — Doorso!`
          : "🎯 Wareegga"
      )
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true)
  );
  rows.push(headerRow);

  // Tile rows (max 4 rows × 5 cols = 20 tiles, + 1 header = 5 rows total ✓)
  const tiles = game.tiles;
  for (let i = 0; i < tiles.length; i += COLS) {
    const row   = new ActionRowBuilder<ButtonBuilder>();
    const chunk = tiles.slice(i, i + COLS);
    for (const tile of chunk) {
      const btn = new ButtonBuilder().setCustomId(`tile_${tile.index}`);
      if (!tile.revealed) {
        btn.setLabel("❓").setStyle(ButtonStyle.Secondary).setDisabled(false);
      } else if (tile.isBomb) {
        btn.setLabel("💣").setStyle(ButtonStyle.Danger).setDisabled(true);
      } else {
        btn.setLabel("✅").setStyle(ButtonStyle.Success).setDisabled(true);
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }

  return rows;
}

// ─── Final Two Embed ─────────────────────────────────────────────────────────

export function buildFinalTwoEmbed(
  game: GameState,
  lastActionText?: string
): EmbedBuilder {
  const [p1id, p2id] = game.activePlayers;
  const p1 = game.players.find((p) => p.userId === p1id);
  const p2 = game.players.find((p) => p.userId === p2id);

  let desc = "";
  if (lastActionText) desc += `${lastActionText}\n\n`;
  desc +=
    `⚡ **${p1?.displayName}** vs **${p2?.displayName}**!\n\n` +
    `Mid walba waa inuu doorto: 💣 **Dab** ama 🟢 **Badbaado**.\n` +
    `Hore u riix — adigu ayaa nasiibkaaga go'aamiya!`;

  return new EmbedBuilder()
    .setTitle("⚡  DAGAALKA UGU DAMBEEYA — 2 Ciyaartooy!")
    .setColor(GOLD_COLOR)
    .setDescription(desc)
    .addFields({
      name: "💰 Abaalmarinta",
      value: `\`$${game.prizePool.toLocaleString()}\``,
      inline: true,
    })
    .setTimestamp();
}

export function buildFinalTwoButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("final_bomb")
      .setLabel("Dab")
      .setEmoji("💣")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("final_safe")
      .setLabel("Badbaado")
      .setEmoji("🟢")
      .setStyle(ButtonStyle.Success)
  );
}

// ─── Winner Embed ────────────────────────────────────────────────────────────

export function buildWinnerEmbed(
  winnerName: string,
  prize: number,
  newBalance: number
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("🏆  GUULEYSTAY!")
    .setColor(GOLD_COLOR)
    .setDescription(
      `> 👑  **${winnerName}**\n> 🏆  *Midka ugu dambeeyay ee badbaaday*\n\n` +
        `💰  **Abaalmarinta: $${prize.toLocaleString()}**\n` +
        `🏦  **Buuxi cusub: $${newBalance.toLocaleString()}**\n\n` +
        `**Hambalyo! 🎉**`
    )
    .setTimestamp();
}

// ─── Disabled lobby buttons (shown after game starts) ─────────────────────────

export function disabledLobbyButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("join_game_d")
      .setLabel("Ku biir")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("leave_game_d")
      .setLabel("Ka bax")
      .setEmoji("🚪")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("start_game_d")
      .setLabel("Bilaab hadda")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("stop_game_d")
      .setLabel("Jooji")
      .setEmoji("⛔")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true)
  );
}

// ─── Disabled tile board (game over state) ───────────────────────────────────

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

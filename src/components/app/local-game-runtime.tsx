"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { LocalGameTransition, LocalPlayerSplash, type LocalTransitionPlayer } from "@/components/app/local-game-transition";
import { GameEngine, GameState, type PlayerData, type RoundData, type RoundResult, type Standing } from "@/lib/game/game-engine";
import { KEYBOARD_ROWS, normalizeGameKey, type GameKey } from "@/lib/game/keys";

const AUDIO_MATCH_STATE_EVENT = "reflexRoyaleMatchState";
const LOCAL_TRANSITION_DURATION_MS = 3000;
const LOCAL_PLAYER_SPLASH_DURATION_MS = 2800;
const THEME_STORAGE_KEY = "reflexRoyaleThemeCommand";
const UI_LAB_THEME_STORAGE_KEY = "ui-lab-theme";

type ThemeProtocol = {
  id: string;
  label: string;
  fallbackColor: string;
  color: string;
};

type LocalTransitionState = {
  duration: number;
  splashDuration: number;
  players: LocalTransitionPlayer[];
  phase: "tunnel" | "splash";
};

type LocalGameRuntimeProps = {
  localPlayerThemeShades?: Record<string, string> | null;
};

type ArenaFeedback = Record<string, { kind: "falseStart" | "reaction"; text: string }>;

const THEME_PROTOCOLS = [
  { id: "ares", label: "Ares", fallbackColor: "#ff003c" },
  { id: "vulcan", label: "Vulcan", fallbackColor: "#ff7a00" },
  { id: "apollo", label: "Apollo", fallbackColor: "#ffd400" },
  { id: "gaia", label: "Gaia", fallbackColor: "#24f07a" },
  { id: "tron", label: "Tron", fallbackColor: "#00d4ff" },
  { id: "bacchus", label: "Bacchus", fallbackColor: "#8a2bff" },
  { id: "aphrodite", label: "Aphrodite", fallbackColor: "#ff2ebd" },
  { id: "olympus", label: "Olympus", fallbackColor: "#FFFFFF" },
] as const;

function announceMatchState(inProgress: boolean) {
  window.dispatchEvent(new CustomEvent(AUDIO_MATCH_STATE_EVENT, { detail: { inProgress } }));
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function normalizeThemeCommand(value: unknown) {
  return THEME_PROTOCOLS.some((protocol) => protocol.id === value) ? String(value) : "tron";
}

function readCurrentThemeCommand() {
  if (typeof window === "undefined") return "tron";
  return normalizeThemeCommand(window.localStorage.getItem(THEME_STORAGE_KEY) || window.localStorage.getItem(UI_LAB_THEME_STORAGE_KEY));
}

function getThemePalette(localPlayerThemeShades: Record<string, string> | null | undefined): ThemeProtocol[] {
  const accountShades = localPlayerThemeShades || {};
  return THEME_PROTOCOLS.map((protocol) => ({
    ...protocol,
    color: isHexColor(accountShades[protocol.id]) ? accountShades[protocol.id] : protocol.fallbackColor,
  }));
}

function isTypingInLobby() {
  const active = document.activeElement;
  if (!active) return false;
  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(active.tagName) || active instanceof HTMLElement && active.isContentEditable;
}

function formatResult(result: RoundResult) {
  if (result.falseStart) return "False start!";
  if (result.missed) return "Missed!";
  return `${result.time} ms`;
}

function createSnapshot(engine: GameEngine) {
  return {
    state: engine.state,
    players: engine.getPlayers(),
    currentRound: engine.currentRound,
    totalRounds: engine.totalRounds,
    roundHistory: engine.roundHistory,
  };
}

function ThemePicker({
  claimedThemeCommands,
  selectedThemeCommand,
  setSelectedThemeCommand,
  themePalette,
}: {
  claimedThemeCommands: Set<string>;
  selectedThemeCommand: string;
  setSelectedThemeCommand: (value: string) => void;
  themePalette: ThemeProtocol[];
}) {
  const [open, setOpen] = useState(false);
  const selected = themePalette.find((protocol) => protocol.id === selectedThemeCommand) || themePalette[0] || null;
  const selectedColor = selected?.color || "var(--primary, #68e8ff)";

  useEffect(() => {
    if (!open) return;
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".chroma-sigil-field")) return;
      setOpen(false);
    };
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [open]);

  return (
    <div className="chroma-sigil-field" style={{ "--sigil-color": selectedColor } as React.CSSProperties}>
      <button
        id="themePickerButton"
        className="btn btn-secondary chroma-sigil-button"
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="themePickerPanel"
        disabled={!selected}
        style={{ "--sigil-color": selectedColor } as React.CSSProperties}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <span className="chroma-sigil-summary__label">Chroma Sigil:</span>
        <span id="themePickerButtonLabel" className="chroma-sigil-summary__name">{selected?.label || "All Claimed"}</span>
      </button>
      <div id="themePickerPanel" className="chroma-sigil-panel" role="dialog" aria-label="Choose Chroma Sigil" hidden={!open}>
        <div id="themePickerTabs" className="chroma-sigil-tabs" role="tablist" aria-label="Player color protocol">
          {themePalette.map((protocol) => {
            const claimed = claimedThemeCommands.has(protocol.id);
            const active = protocol.id === selectedThemeCommand && !claimed;
            return (
              <button
                className={`chroma-sigil-tab ${active ? "is-active" : ""} ${claimed ? "is-claimed" : ""}`}
                type="button"
                role="tab"
                aria-selected={active}
                data-theme-command={protocol.id}
                style={{ "--sigil-color": protocol.color } as React.CSSProperties}
                disabled={claimed}
                key={protocol.id}
                onClick={() => {
                  if (claimed) return;
                  setSelectedThemeCommand(protocol.id);
                }}
              >
                <span className="chroma-sigil-tab__swatch" aria-hidden="true" />
                <span>{protocol.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HolographicKeyboard({
  activeKey,
  currentPlayerId = null,
  draggable = false,
  onDropPlayerKey,
  onKeyClick,
  players,
  title,
}: {
  activeKey: string;
  currentPlayerId?: string | null;
  draggable?: boolean;
  onDropPlayerKey?: (playerId: string, key: GameKey) => void;
  onKeyClick?: (key: GameKey) => void;
  players: Array<Partial<PlayerData> & { keyBinding?: string | null; isReady?: boolean }>;
  title: string;
}) {
  const [draggingKey, setDraggingKey] = useState("");
  const [dropTargetKey, setDropTargetKey] = useState("");
  const byKey = new Map<string, { color: string; id: string; name: string; draggable: boolean; ready: boolean }>();

  for (const player of players) {
    const key = normalizeGameKey(player.key || player.keyBinding || "");
    if (!key) continue;
    byKey.set(key, {
      color: player.color || "#888888",
      id: player.id || "",
      name: player.name || "Player",
      draggable: Boolean(draggable && !player.ready && !player.isReady && (!currentPlayerId || player.id === currentPlayerId)),
      ready: Boolean(player.ready || player.isReady),
    });
  }

  return (
    <section className="holo-keyboard-panel" aria-label={title}>
      <div className="holo-keyboard-panel__header">
        <span>{title}</span>
        <span>click a key to assign</span>
      </div>
      <div className="holo-keyboard" role="group" aria-label="Allowed character keys">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div className="holo-keyboard-row" key={rowIndex}>
            {row.map((key) => {
              const owner = byKey.get(key);
              const className = [
                "holo-key",
                owner ? "holo-key--bound" : "",
                owner?.ready ? "holo-key--ready" : "",
                activeKey === key ? "holo-key--input-active" : "",
                draggingKey === key ? "holo-key--dragging" : "",
                dropTargetKey === key ? "holo-key--drop-target" : "",
              ].filter(Boolean).join(" ");
              return (
                <button
                  type="button"
                  className={className}
                  data-key={key}
                  data-occupied={owner ? "true" : "false"}
                  draggable={owner?.draggable || undefined}
                  data-draggable={owner?.draggable ? "true" : undefined}
                  data-player-id={owner?.draggable ? owner.id : undefined}
                  aria-label={owner ? `${key} assigned to ${owner.name}${owner.ready ? ", ready" : ""}` : `Assign ${key}`}
                  style={owner ? { "--key-color": owner.color } as React.CSSProperties : undefined}
                  onClick={() => onKeyClick?.(key)}
                  onDragStart={(event) => {
                    if (!owner?.draggable) {
                      event.preventDefault();
                      return;
                    }
                    setDraggingKey(key);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", owner.id);
                    event.dataTransfer.setData("application/x-player-color", owner.color);
                  }}
                  onDragEnd={() => {
                    setDraggingKey("");
                    setDropTargetKey("");
                  }}
                  onDragOver={(event) => {
                    if (owner) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDropTargetKey(key);
                  }}
                  onDragLeave={() => setDropTargetKey((value) => value === key ? "" : value)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDropTargetKey("");
                    const playerId = event.dataTransfer.getData("text/plain");
                    if (owner || !playerId) return;
                    onDropPlayerKey?.(playerId, key);
                  }}
                  key={key}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function PlayerSlots({ engine, players, refresh, themePalette }: { engine: GameEngine; players: PlayerData[]; refresh: () => void; themePalette: ThemeProtocol[] }) {
  const positions = ["top-left", "top-right", "bottom-left", "bottom-right"];
  const cards = positions.map((position, index) => {
    const player = players[index];
    if (!player) return <div className={`player-slot-dock player-slot-dock--${position} player-slot-dock--empty`} aria-hidden="true" key={position} />;
    return (
      <div className={`player-slot-dock player-slot-dock--${position}`} key={position}>
        <div className={`player-slot ${player.ready ? "player-slot--ready" : ""} player-slot--removable`} style={{ "--player-color": player.color, borderColor: player.color } as React.CSSProperties}>
          <span className="player-slot-name" style={{ color: player.color }}>{player.name}</span>
          <span className="player-slot__protocol">{themePalette.find((protocol) => protocol.id === player.themeCommand)?.label || "Custom"}</span>
          <button
            className="btn-remove player-slot__remove"
            type="button"
            aria-label={`Remove ${player.name}`}
            data-id={player.id}
            onClick={() => {
              engine.removePlayer(player.id);
              refresh();
            }}
          />
        </div>
      </div>
    );
  });

  return (
    <div id="playerSlots" className="player-slots player-slots--grid" aria-label="Player slots">
      <div className="player-slot-stack player-slot-stack--left">
        {cards[0]}
        {cards[2]}
      </div>
      <div className="player-slot-stack player-slot-stack--right">
        {cards[1]}
        {cards[3]}
      </div>
    </div>
  );
}

function LocalLobby({
  activeKey,
  engine,
  players,
  refresh,
  selectedThemeCommand,
  setActiveKey,
  setLocalTransition,
  setSelectedThemeCommand,
  themePalette,
}: {
  activeKey: string;
  engine: GameEngine;
  players: PlayerData[];
  refresh: () => void;
  selectedThemeCommand: string;
  setActiveKey: (key: string) => void;
  setLocalTransition: (transition: LocalTransitionState | null) => void;
  setSelectedThemeCommand: (value: string) => void;
  themePalette: ThemeProtocol[];
}) {
  const [name, setName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [roundCount, setRoundCount] = useState(5);
  const [status, setStatus] = useState("");
  const [transitionPending, setTransitionPending] = useState(false);
  const claimedThemeCommands = useMemo(() => new Set(players.map((player) => player.themeCommand).filter(Boolean) as string[]), [players]);
  const selectedTheme = themePalette.find((protocol) => protocol.id === selectedThemeCommand) || themePalette[0] || null;
  const canStart = !transitionPending && players.length >= 2 && players.every((player) => player.ready);
  const percent = ((roundCount - 1) / 19) * 100;

  useEffect(() => {
    if (selectedTheme && !claimedThemeCommands.has(selectedTheme.id)) return;
    const available = themePalette.find((protocol) => !claimedThemeCommands.has(protocol.id));
    if (available) setSelectedThemeCommand(available.id);
  }, [claimedThemeCommands, selectedTheme, setSelectedThemeCommand, themePalette]);

  const addPlayer = useCallback(() => {
    const normalizedKey = normalizeGameKey(keyValue.trim());
    if (!name.trim() || !normalizedKey) {
      setStatus("Enter both a player name and a unique key.");
      return;
    }
    if (!selectedTheme) {
      setStatus("All Chroma Sigils are already claimed.");
      return;
    }

    const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const success = engine.addPlayer(id, name.trim(), normalizedKey, selectedTheme.color, selectedTheme.id);
    if (!success) {
      setStatus("That key is invalid, already in use, or the lobby is full.");
      return;
    }

    setName("");
    setKeyValue("");
    setStatus("");
    const available = themePalette.find((protocol) => !new Set([...claimedThemeCommands, selectedTheme.id]).has(protocol.id));
    if (available) setSelectedThemeCommand(available.id);
    refresh();
  }, [claimedThemeCommands, engine, keyValue, name, refresh, selectedTheme, setSelectedThemeCommand, themePalette]);

  const startGame = () => {
    if (!canStart) return;
    const transitionPlayers = players.map((player) => {
      const theme = themePalette.find((protocol) => protocol.id === player.themeCommand);
      return {
        id: player.id,
        name: player.name,
        color: player.color,
        themeCommand: player.themeCommand,
        themeLabel: theme?.label || "Custom",
        key: player.key,
      } satisfies LocalTransitionPlayer;
    });
    engine.totalRounds = roundCount;
    flushSync(() => {
      setLocalTransition({ duration: LOCAL_TRANSITION_DURATION_MS, splashDuration: LOCAL_PLAYER_SPLASH_DURATION_MS, players: transitionPlayers, phase: "tunnel" });
      setTransitionPending(true);
    });
    window.setTimeout(() => {
      setLocalTransition({ duration: LOCAL_TRANSITION_DURATION_MS, splashDuration: LOCAL_PLAYER_SPLASH_DURATION_MS, players: transitionPlayers, phase: "splash" });
    }, LOCAL_TRANSITION_DURATION_MS);
    window.setTimeout(() => {
      setLocalTransition(null);
      setTransitionPending(false);
      refresh();
    }, LOCAL_TRANSITION_DURATION_MS + LOCAL_PLAYER_SPLASH_DURATION_MS);

    const started = engine.startGame({ countdownDelayMs: LOCAL_TRANSITION_DURATION_MS + LOCAL_PLAYER_SPLASH_DURATION_MS });
    if (!started) {
      setLocalTransition(null);
      setTransitionPending(false);
    }
    refresh();
  };

  return (
    <div className="lobby">
      <div className="lobby-layout-top">
        <h1 className="game-title"><a href="/">Reflex Royale</a></h1>
        <p className="subtitle">Local Multiplayer - 2-4 Players</p>
      </div>
      <div className="lobby-player-grid">
        <PlayerSlots engine={engine} players={players} refresh={refresh} themePalette={themePalette} />
        <div className="lobby-control-stack">
          <div className="lobby-form">
            <div className="input-row input-row--local-player">
              <input id="playerName" type="text" placeholder="Player name" maxLength={12} autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addPlayer(); setActiveKey(normalizeGameKey(event.key)); }} />
              <input
                id="playerKey"
                type="text"
                placeholder="Key"
                maxLength={1}
                autoComplete="off"
                value={keyValue}
                onChange={(event) => setKeyValue(normalizeGameKey(event.target.value).toUpperCase())}
                onKeyDown={(event) => {
                  event.preventDefault();
                  const key = normalizeGameKey(event.key);
                  setActiveKey(key);
                  setKeyValue(key.toUpperCase());
                }}
              />
              <button id="addPlayerBtn" className="btn btn-primary" type="button" onClick={addPlayer}>Add Player</button>
            </div>
            <ThemePicker claimedThemeCommands={claimedThemeCommands} selectedThemeCommand={selectedThemeCommand} setSelectedThemeCommand={setSelectedThemeCommand} themePalette={themePalette} />
            <p className="hint">Click a holographic key or press a character key, claim a Chroma Sigil, then add the player. Press assigned keys to toggle ready.</p>
            <p id="lobbyStatus" className="hint">{status}</p>
          </div>
          <div className="lobby-settings">
            <div data-slot="tron-slider" className="round-slider" aria-label="Rounds slider">
              <div className="round-slider__header">
                <span className="round-control">Rounds</span>
                <span id="roundCountValue" className="round-slider__value">{roundCount}</span>
              </div>
              <div className="round-slider__track-wrap">
                <div data-slot="slider-track" className="round-slider__track" />
                <div data-slot="slider-range" className="round-slider__range" style={{ width: `${percent}%` }} />
                <div data-slot="slider-thumb" className="round-slider__thumb" style={{ left: `${percent}%` }} />
                <input id="roundCount" className="round-slider__input" type="range" min="1" max="20" step="1" value={roundCount} onChange={(event) => setRoundCount(Number(event.target.value))} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="holoKeyboardMount" style={{ "--keyboard-accent": selectedTheme?.color || "var(--primary, #68e8ff)", paddingTop: "18px" } as React.CSSProperties}>
        <HolographicKeyboard activeKey={activeKey} draggable players={players} title="LOCAL KEYBOARD MATRIX" onKeyClick={(key) => { setKeyValue(key.toUpperCase()); setActiveKey(key); }} onDropPlayerKey={(playerId, key) => { engine.movePlayerKey(playerId, key); setKeyValue(key.toUpperCase()); refresh(); }} />
      </div>
      <div className="lobby-layout-bottom">
        <button id="startGameBtn" className="btn btn-big btn-go" type="button" disabled={!canStart} onClick={startGame}>Start Game</button>
      </div>
    </div>
  );
}

function LocalArena({ countdownRemaining, engine, feedback, players, refresh, roundData, state, themePalette }: { countdownRemaining: number | null; engine: GameEngine; feedback: ArenaFeedback; players: PlayerData[]; refresh: () => void; roundData: RoundData | null; state: string; themePalette: ThemeProtocol[] }) {
  const gridClass = `grid-${players.length}`;
  const isRoundEnd = state === GameState.ROUND_END && roundData;
  const isLast = roundData ? roundData.roundNum >= engine.totalRounds || players.some((player) => player.totalScore >= engine.targetScore) : false;
  const phase = state === GameState.COUNTDOWN ? "countdown" : state === GameState.WAITING ? "waiting" : state === GameState.REACT ? "react" : "";

  return (
    <>
      <div className={`arena ${gridClass} ${phase ? `arena--${phase}` : ""}`}>
        {players.map((player) => {
          const lightClass = state === GameState.WAITING ? "red" : state === GameState.REACT ? "green" : "off";
          const playerFeedback = feedback[player.id];
          return (
            <div className="player-panel" id={`panel-${player.id}`} style={{ "--player-color": player.color } as React.CSSProperties} data-signal={state === GameState.COUNTDOWN ? String(countdownRemaining ?? engine.countdownSeconds) : undefined} key={player.id}>
              <div className="panel-header">
                <span className="panel-name">{player.name}</span>
                <kbd className="panel-key">{player.key?.toUpperCase()}</kbd>
              </div>
              <span className="panel-score">{player.totalScore} pts</span>
              <div className="panel-light"><div className={`light-circle ${playerFeedback?.kind === "falseStart" ? "red flash" : lightClass}`} /></div>
              <div className="panel-feedback">
                {playerFeedback ? <span className={playerFeedback.kind === "falseStart" ? "false-start" : "reaction-time"}>{playerFeedback.text}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className={`center-overlay ${isRoundEnd ? "visible results-overlay" : ""}`} id="centerOverlay">
        {isRoundEnd ? (
          <div className="round-results">
            <h2>Round {roundData.roundNum} Results</h2>
            <ol className="results-list">
              {roundData.results.map((result, index) => (
                <li className={index === 0 && result.time !== Infinity ? "winner" : ""} key={result.id}>
                  <span className="result-name">{result.name}</span>
                  <span className="result-time">{formatResult(result)}</span>
                  <span className="result-points">{result.points ? `+${result.points}` : "-"}</span>
                </li>
              ))}
            </ol>
            <button id="nextRoundBtn" className="btn btn-primary btn-big" type="button" onClick={() => { engine.nextRound(); refresh(); }}>{isLast ? "See Final Results" : "Next Round"}</button>
          </div>
        ) : null}
      </div>
    </>
  );
}

function LocalGameOver({ engine, refresh, roundHistory, standings }: { engine: GameEngine; refresh: () => void; roundHistory: RoundData[]; standings: Standing[] }) {
  return (
    <div className="game-over">
      <h1 className="winner-banner">{standings[0]?.name || "Player"} Wins!</h1>
      <table className="standings-table">
        <thead><tr><th>#</th><th>Player</th><th>Score</th><th>Wins</th><th>Best</th><th>Avg</th><th>False Starts</th></tr></thead>
        <tbody>
          {standings.map((standing, index) => (
            <tr style={{ color: standing.color }} className={index === 0 ? "first-place" : ""} key={standing.id}>
              <td>{index + 1}</td><td>{standing.name}</td><td>{standing.totalScore}</td><td>{standing.wins}</td><td>{standing.bestTime !== null ? `${standing.bestTime} ms` : "-"}</td><td>{standing.avgTime !== null ? `${standing.avgTime} ms` : "-"}</td><td>{standing.falseStarts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Round-by-Round</h3>
      <div className="round-history">
        {roundHistory.map((round) => (
          <div className="history-round" key={round.roundNum}>
            <strong>Round {round.roundNum}</strong>
            <ul>
              {round.results.map((result) => <li key={result.id}>{result.name}: {result.falseStart ? "False start" : result.missed ? "Missed" : `${result.time} ms`} {result.points ? `(+${result.points})` : ""}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="game-over-actions">
        <button id="playAgainBtn" className="btn btn-primary btn-big" type="button" onClick={() => { engine.resetToLobby(); refresh(); }}>Play Again</button>
        <button id="newPlayersBtn" className="btn btn-secondary" type="button" onClick={() => { engine.fullReset(); refresh(); }}>New Players</button>
      </div>
    </div>
  );
}

export function LocalGameRuntime({ localPlayerThemeShades = null }: LocalGameRuntimeProps) {
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) engineRef.current = new GameEngine();
  const engine = engineRef.current;
  const [snapshot, setSnapshot] = useState(() => createSnapshot(engine));
  const [selectedThemeCommand, setSelectedThemeCommand] = useState("tron");
  const [localTransition, setLocalTransition] = useState<LocalTransitionState | null>(null);
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [feedback, setFeedback] = useState<ArenaFeedback>({});
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [activeKey, setActiveKey] = useState("");
  const activeKeyTimeout = useRef<number | null>(null);
  const themePalette = useMemo(() => getThemePalette(localPlayerThemeShades), [localPlayerThemeShades]);
  const refresh = useCallback(() => setSnapshot(createSnapshot(engine)), [engine]);

  const pulseKey = useCallback((key: string) => {
    setActiveKey(key);
    if (activeKeyTimeout.current) window.clearTimeout(activeKeyTimeout.current);
    activeKeyTimeout.current = window.setTimeout(() => setActiveKey(""), 420);
  }, []);

  useEffect(() => setSelectedThemeCommand(readCurrentThemeCommand()), []);

  useEffect(() => {
    delete document.documentElement.dataset.pageReady;
    const first = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.documentElement.dataset.pageReady = "true";
        window.__reflexRoyaleGameReady = true;
        window.dispatchEvent(new Event("reflex-royale-game-ready"));
      });
    });
    return () => window.cancelAnimationFrame(first);
  }, []);

  useEffect(() => {
    const refreshFromEngine = () => refresh();
    const onGameStarted = () => {
      announceMatchState(true);
      setCountdownRemaining(null);
      setRoundData(null);
      setStandings(null);
      setFeedback({});
      refresh();
    };
    const onCountdown = ({ remaining }: { remaining: number }) => {
      setCountdownRemaining(remaining);
      setFeedback({});
      setRoundData(null);
      refresh();
    };
    const onWaiting = () => {
      setCountdownRemaining(null);
      refresh();
    };
    const onFalseStart = ({ id }: { id: string }) => {
      setFeedback((value) => ({ ...value, [id]: { kind: "falseStart", text: "Too early!" } }));
      refresh();
    };
    const onPlayerReacted = ({ id, time }: { id: string; time: number }) => {
      setFeedback((value) => ({ ...value, [id]: { kind: "reaction", text: `${time} ms` } }));
      refresh();
    };
    const onRoundEnd = (data: RoundData) => {
      setCountdownRemaining(null);
      setRoundData(data);
      refresh();
    };
    const onGameOver = ({ standings: nextStandings }: { standings: Standing[] }) => {
      announceMatchState(false);
      setCountdownRemaining(null);
      setRoundData(null);
      setStandings(nextStandings);
      refresh();
    };
    const onReset = () => {
      announceMatchState(false);
      setCountdownRemaining(null);
      setRoundData(null);
      setStandings(null);
      setFeedback({});
      refresh();
    };

    engine.on("playerAdded", refreshFromEngine);
    engine.on("playerRemoved", refreshFromEngine);
    engine.on("playerReady", refreshFromEngine);
    engine.on("playerUnready", refreshFromEngine);
    engine.on("playerKeyMoved", refreshFromEngine);
    engine.on("allPlayersReady", refreshFromEngine);
    engine.on("gameStarted", onGameStarted);
    engine.on("countdown", onCountdown);
    engine.on("waiting", onWaiting);
    engine.on("react", refreshFromEngine);
    engine.on("falseStart", onFalseStart);
    engine.on("playerReacted", onPlayerReacted);
    engine.on("roundEnd", onRoundEnd);
    engine.on("gameOver", onGameOver);
    engine.on("resetToLobby", onReset);
    engine.on("fullReset", onReset);

    return () => {
      engine.off("playerAdded", refreshFromEngine);
      engine.off("playerRemoved", refreshFromEngine);
      engine.off("playerReady", refreshFromEngine);
      engine.off("playerUnready", refreshFromEngine);
      engine.off("playerKeyMoved", refreshFromEngine);
      engine.off("allPlayersReady", refreshFromEngine);
      engine.off("gameStarted", onGameStarted);
      engine.off("countdown", onCountdown);
      engine.off("waiting", onWaiting);
      engine.off("react", refreshFromEngine);
      engine.off("falseStart", onFalseStart);
      engine.off("playerReacted", onPlayerReacted);
      engine.off("roundEnd", onRoundEnd);
      engine.off("gameOver", onGameOver);
      engine.off("resetToLobby", onReset);
      engine.off("fullReset", onReset);
    };
  }, [engine, refresh]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = normalizeGameKey(event.key);
      if (!key) return;
      pulseKey(key);
      if (engine.state === GameState.LOBBY && !isTypingInLobby()) {
        const confirmed = engine.confirmPlayerByKey(key);
        if (confirmed) {
          event.preventDefault();
          refresh();
          return;
        }
      }
      if (engine.state !== GameState.WAITING && engine.state !== GameState.REACT) return;
      const playerId = engine.findPlayerByKey(key);
      if (playerId) {
        event.preventDefault();
        engine.handleInput(playerId);
        refresh();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [engine, pulseKey, refresh]);

  useEffect(() => {
    return () => {
      if (activeKeyTimeout.current) window.clearTimeout(activeKeyTimeout.current);
      engine.dispose();
      announceMatchState(false);
    };
  }, [engine]);

  const state = snapshot.state;
  const players = snapshot.players;
  const showLobby = state === GameState.LOBBY && !standings;

  return (
    <>
      <link rel="stylesheet" href="/game.css" />
      <div data-wait-for-game-ready="true" className="flex min-h-0 w-full flex-1">
        <div id="game-root" suppressHydrationWarning>
          {showLobby ? (
            <LocalLobby activeKey={activeKey} engine={engine} players={players} refresh={refresh} selectedThemeCommand={selectedThemeCommand} setActiveKey={pulseKey} setLocalTransition={setLocalTransition} setSelectedThemeCommand={setSelectedThemeCommand} themePalette={themePalette} />
          ) : standings ? (
            <LocalGameOver engine={engine} refresh={refresh} roundHistory={snapshot.roundHistory} standings={standings} />
          ) : (
            <LocalArena countdownRemaining={countdownRemaining} engine={engine} feedback={feedback} players={players} refresh={refresh} roundData={roundData} state={state} themePalette={themePalette} />
          )}
        </div>
        {localTransition?.phase === "tunnel" ? <LocalGameTransition className="local-game-transition-overlay" durationMs={localTransition.duration} /> : null}
        {localTransition?.phase === "splash" ? <LocalPlayerSplash className="local-player-splash-overlay" players={localTransition.players} durationMs={localTransition.splashDuration} /> : null}
      </div>
    </>
  );
}

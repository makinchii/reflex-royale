"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Script from "next/script";
import { LocalGameTransition, LocalPlayerSplash, type LocalTransitionPlayer } from "@/components/app/local-game-transition";
import { KEYBOARD_ROWS, normalizeGameKey, type GameKey } from "@/lib/game/keys";
import { ONLINE_STORAGE_KEYS, type OnlineChatMessage, type OnlinePlayer, type OnlineRoomState, type OnlineRoundResult, type OnlineRoundSummary, type OnlineServerToClientEvents, type OnlineStanding } from "@/lib/online/client-contract";
import { createInitialOnlineClientState, onlineClientReducer, type OnlineClientState } from "@/lib/online/client-reducer";

const AUDIO_MATCH_STATE_EVENT = "reflexRoyaleMatchState";
const MATCH_TRANSITION_DURATION_MS = 3000;
const MATCH_PLAYER_SPLASH_DURATION_MS = 2800;
const CHAT_LIMIT = 250;
const THEME_STORAGE_KEY = "reflexRoyaleThemeCommand";
const UI_LAB_THEME_STORAGE_KEY = "ui-lab-theme";

type ThemeProtocol = {
  id: string;
  label: string;
  fallbackColor: string;
  color: string;
};

type SocketLike = {
  on: (event: string, callback: (payload: any) => void) => SocketLike;
  emit: (event: string, payload?: any) => SocketLike;
  removeAllListeners: () => SocketLike;
  disconnect: () => void;
};

type TransitionState = {
  duration: number;
  splashDuration: number;
  players: LocalTransitionPlayer[];
  phase: "tunnel" | "splash";
};

type OnlineGameRuntimeProps = {
  localPlayerThemeShades?: Record<string, string> | null;
};

declare global {
  interface Window {
    io?: () => SocketLike;
    __reflexRoyaleGameReady?: boolean;
  }
}

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

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName) || target.isContentEditable);
}

function readStorage() {
  const verifier = window.localStorage.getItem(ONLINE_STORAGE_KEYS.verifier) || crypto.randomUUID();
  window.localStorage.setItem(ONLINE_STORAGE_KEYS.verifier, verifier);
  return {
    verifier,
    hostReclaimToken: window.localStorage.getItem(ONLINE_STORAGE_KEYS.hostReclaimToken) || "",
    roomCode: window.localStorage.getItem(ONLINE_STORAGE_KEYS.roomCode) || "",
    playerName: window.localStorage.getItem(ONLINE_STORAGE_KEYS.playerName) || "",
  };
}

function persistJoinedRoom(state: OnlineClientState) {
  if (state.verifier) window.localStorage.setItem(ONLINE_STORAGE_KEYS.verifier, state.verifier);
  if (state.savedRoom.roomCode) window.localStorage.setItem(ONLINE_STORAGE_KEYS.roomCode, state.savedRoom.roomCode);
  if (state.savedRoom.playerName) window.localStorage.setItem(ONLINE_STORAGE_KEYS.playerName, state.savedRoom.playerName);
  if (state.savedRoom.hostReclaimToken) window.localStorage.setItem(ONLINE_STORAGE_KEYS.hostReclaimToken, state.savedRoom.hostReclaimToken);
}

function persistClearedRoom(state: OnlineClientState) {
  if (!state.savedRoom.roomCode) window.localStorage.removeItem(ONLINE_STORAGE_KEYS.roomCode);
  if (!state.savedRoom.hostReclaimToken) window.localStorage.removeItem(ONLINE_STORAGE_KEYS.hostReclaimToken);
  if (!state.savedRoom.playerName) window.localStorage.removeItem(ONLINE_STORAGE_KEYS.playerName);
}

function formatResult(result: OnlineRoundResult) {
  if (result.outcome === "false_start" || result.falseStart) return "False start!";
  if (result.outcome === "timeout" || result.missed) return "Missed!";
  if (result.outcome === "disconnected" || result.disconnected) return "Disconnected";
  return `${result.time} ms`;
}

async function recordOnlineRecentMatch(standings: OnlineStanding[], myPlayerId: string | null, matchStartedAt: number) {
  const playerIndex = standings.findIndex((standing) => standing.id === myPlayerId);
  if (playerIndex < 0) return;
  const player = standings[playerIndex];
  if (!player.avgTime) return;
  const reactionTimes = (player.roundTimes || []).filter((time): time is number => Number.isFinite(time) && Number(time) > 0);
  const totalReactionTime = reactionTimes.reduce((total, time) => total + time, 0);
  const matchDurationSeconds = matchStartedAt ? Math.max(1, Math.round((Date.now() - matchStartedAt) / 1000)) : 0;
  try {
    await fetch("/leaderboard/record-match", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        averageReactionTime: Math.round(player.avgTime),
        falseStarts: Math.max(0, Math.round(player.falseStarts || 0)),
        matchDurationSeconds,
        mode: "online",
        place: playerIndex + 1,
        reactions: reactionTimes.length,
        totalReactionTime: Math.max(0, Math.round(totalReactionTime)),
      }),
    });
  } catch {
    // Match history should never interrupt game-over rendering.
  }
}

function RoundSlider({ className = "", id, label, onChange, value }: { className?: string; id: string; label: string; onChange: (value: number) => void; value: number }) {
  const percent = ((value - 1) / 19) * 100;
  return (
    <div data-slot="tron-slider" className={`round-slider ${className}`.trim()} aria-label="Round count slider">
      <div className="round-slider__header">
        <span className="round-control">{label}</span>
        <span id={`${id}Value`} className="round-slider__value">{value}</span>
      </div>
      <div className="round-slider__track-wrap">
        <div data-slot="slider-track" className="round-slider__track" />
        <div data-slot="slider-range" className="round-slider__range" style={{ width: `${percent}%` }} />
        <div data-slot="slider-thumb" className="round-slider__thumb" style={{ left: `${percent}%` }} />
        <input id={id} className="round-slider__input" type="range" min="1" max="20" step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      </div>
    </div>
  );
}

function ThemePicker({ claimedThemeCommands, currentPlayerThemeCommand, onSelect, selectedThemeCommand, themePalette }: { claimedThemeCommands: Set<string>; currentPlayerThemeCommand?: string | null; onSelect: (protocol: ThemeProtocol) => void; selectedThemeCommand: string; themePalette: ThemeProtocol[] }) {
  const [open, setOpen] = useState(false);
  const selected = themePalette.find((protocol) => protocol.id === (currentPlayerThemeCommand || selectedThemeCommand)) || themePalette[0] || null;
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
      <button id="themePickerButton" className="btn btn-secondary chroma-sigil-button" type="button" aria-expanded={open} aria-haspopup="dialog" aria-controls="themePickerPanel" disabled={!selected} style={{ "--sigil-color": selectedColor } as React.CSSProperties} onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }}>
        <span className="chroma-sigil-summary__label">Chroma Sigil:</span>
        <span id="themePickerButtonLabel" className="chroma-sigil-summary__name">{selected?.label || "All Claimed"}</span>
      </button>
      <div id="themePickerPanel" className="chroma-sigil-panel" role="dialog" aria-label="Choose Chroma Sigil" hidden={!open}>
        <div id="themePickerTabs" className="chroma-sigil-tabs" role="tablist" aria-label="Player color protocol">
          {themePalette.map((protocol) => {
            const claimedByPlayer = currentPlayerThemeCommand === protocol.id;
            const claimedByOther = claimedThemeCommands.has(protocol.id) && !claimedByPlayer;
            const active = protocol.id === selectedThemeCommand || claimedByPlayer;
            return (
              <button className={`chroma-sigil-tab ${active ? "is-active" : ""} ${claimedByOther || claimedByPlayer ? "is-claimed" : ""}`} type="button" role="tab" aria-selected={active} data-theme-command={protocol.id} style={{ "--sigil-color": protocol.color } as React.CSSProperties} disabled={claimedByOther} key={protocol.id} onClick={() => onSelect(protocol)}>
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

function HolographicKeyboard({ activeKey, currentPlayerId = null, draggable = false, onDropPlayerKey, onEntryKey, onKeyClick, players, title }: { activeKey: string; currentPlayerId?: string | null; draggable?: boolean; onDropPlayerKey?: (key: GameKey) => void; onEntryKey?: (key: GameKey) => void; onKeyClick?: (key: GameKey) => void; players: Array<Partial<OnlinePlayer> & { key?: string | null }>; title: string }) {
  const [draggingKey, setDraggingKey] = useState("");
  const [dropTargetKey, setDropTargetKey] = useState("");
  const byKey = new Map<string, { color: string; id: string; name: string; draggable: boolean; ready: boolean }>();
  for (const player of players) {
    const key = normalizeGameKey(player.key || player.keyBinding || "");
    if (!key) continue;
    byKey.set(key, { color: player.color || "#888888", id: player.id || "", name: player.name || "Player", draggable: Boolean(draggable && !player.isReady && (!currentPlayerId || player.id === currentPlayerId)), ready: Boolean(player.isReady) });
  }

  return (
    <section className="holo-keyboard-panel" aria-label={title}>
      <div className="holo-keyboard-panel__header"><span>{title}</span><span>click a key to assign</span></div>
      <div className="holo-keyboard" role="group" aria-label="Allowed character keys">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div className="holo-keyboard-row" key={rowIndex}>
            {row.map((key) => {
              const owner = byKey.get(key);
              const className = ["holo-key", owner ? "holo-key--bound" : "", owner?.ready ? "holo-key--ready" : "", activeKey === key ? "holo-key--input-active" : "", draggingKey === key ? "holo-key--dragging" : "", dropTargetKey === key ? "holo-key--drop-target" : ""].filter(Boolean).join(" ");
              return (
                <button type="button" className={className} data-key={key} data-occupied={owner ? "true" : "false"} draggable={owner?.draggable || undefined} data-draggable={owner?.draggable ? "true" : undefined} aria-label={owner ? `${key} assigned to ${owner.name}${owner.ready ? ", ready" : ""}` : `Assign ${key}`} style={owner ? { "--key-color": owner.color } as React.CSSProperties : undefined} onClick={() => { onEntryKey?.(key); onKeyClick?.(key); }} onDragStart={(event) => { if (!owner?.draggable) { event.preventDefault(); return; } setDraggingKey(key); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", key); event.dataTransfer.setData("application/x-player-color", owner.color); }} onDragEnd={() => { setDraggingKey(""); setDropTargetKey(""); }} onDragOver={(event) => { if (owner) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTargetKey(key); }} onDragLeave={() => setDropTargetKey((value) => value === key ? "" : value)} onDrop={(event) => { event.preventDefault(); setDropTargetKey(""); if (owner) return; onDropPlayerKey?.(key); }} key={key}>{key}</button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function ChatPanel({ messages, onSend, players }: { messages: OnlineChatMessage[]; onSend: (content: string) => void; players: OnlinePlayer[] }) {
  const [value, setValue] = useState("");
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const playerColors = useMemo(() => new Map(players.map((player) => [player.id, player.color])), [players]);
  useEffect(() => { if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight; }, [messages]);
  const send = () => {
    const content = value.trim();
    if (!content) return;
    onSend(content);
    setValue("");
  };
  return (
    <section className="chat-panel chat-panel--terminal" aria-label="Room chat terminal">
      <div className="chat-terminal-bar" aria-hidden="true"><span className="chat-terminal-led" /><span>CHAT://ROOM</span><span className="chat-terminal-status">LIVE</span></div>
      <div id="chatMessages" className="chat-messages" role="log" aria-live="polite" aria-relevant="additions" ref={messagesRef}>
        {messages.length ? messages.map((message, index) => {
          const anyMessage = message as OnlineChatMessage & { senderPlayerId?: string; senderColor?: string; senderName?: string };
          return <div className="chat-message" key={message.id || index}><span className="chat-sender" style={{ "--chat-sender-color": playerColors.get(anyMessage.senderPlayerId || message.playerId || "") || anyMessage.senderColor || "var(--primary, #68e8ff)" } as React.CSSProperties}>{anyMessage.senderName || message.name || "Player"}:</span> <span className="chat-content">{message.content}</span></div>;
        }) : <p className="hint">No chat yet.</p>}
      </div>
      <div className="input-row chat-command-row"><span className="chat-prompt" aria-hidden="true">&gt;</span><input id="chatInput" type="text" placeholder="Press Enter to chat" maxLength={CHAT_LIMIT} autoComplete="off" aria-label="Chat message" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); send(); } }} /><span id="chatCharCounter" className="chat-char-counter" aria-live="polite">{CHAT_LIMIT - value.length}</span><button id="sendChatBtn" className="btn btn-secondary" type="button" onClick={send}>Send</button></div>
    </section>
  );
}

function Roster({ isHost, myPlayerId, onRemove, players, roomState, themePalette }: { isHost: boolean; myPlayerId: string | null; onRemove: (playerId: string) => void; players: OnlinePlayer[]; roomState: OnlineRoomState | null; themePalette: ThemeProtocol[] }) {
  const visiblePlayers = players.filter((player) => player.connected !== false);
  const positions = ["top-left", "top-right", "bottom-left", "bottom-right"];
  const host = visiblePlayers.find((player) => player.id === roomState?.hostId) || visiblePlayers[0] || null;
  const ordered = host ? [host, ...visiblePlayers.filter((player) => player.id !== host.id)] : visiblePlayers;
  const cards = positions.map((position, index) => {
    const player = ordered[index];
    if (!player) return <div className={`player-slot-dock player-slot-dock--${position} player-slot-dock--empty`} aria-hidden="true" key={position} />;
    const canRemove = isHost && player.id !== myPlayerId;
    return (
      <div className={`player-slot-dock player-slot-dock--${position}`} key={position}>
        <div className={`player-slot ${player.isReady ? "player-slot--ready" : ""} ${canRemove ? "player-slot--removable" : ""}`} style={{ "--player-color": player.color, borderColor: player.color } as React.CSSProperties}>
          <span className="player-slot-name" style={{ color: player.color }}>{player.name}</span>
          <span className="player-slot__protocol">{themePalette.find((protocol) => protocol.id === player.themeCommand)?.label || "Custom"}</span>
          {canRemove ? <button className="btn-remove player-slot__remove" type="button" aria-label={`Remove ${player.name}`} data-remove-id={player.id} onClick={() => onRemove(player.id)} /> : null}
        </div>
      </div>
    );
  });
  return <div id="remotePlayerSlots" className="player-slots player-slots--grid" aria-label="Player slots"><div className="player-slot-stack player-slot-stack--left">{cards[0]}{cards[2]}</div><div className="player-slot-stack player-slot-stack--right">{cards[1]}{cards[3]}</div></div>;
}

function HostRosterControls({ actionLabel = "Remove", isHost, myPlayerId, onRemove, players }: { actionLabel?: string; isHost: boolean; myPlayerId: string | null; onRemove: (playerId: string) => void; players: OnlinePlayer[] }) {
  if (!isHost) return null;
  const removable = players.filter((player) => player.connected !== false && player.id !== myPlayerId);
  return <div id="hostRosterControls" className="game-over-actions">{removable.length ? removable.map((player) => <button className="btn btn-secondary" type="button" data-remove-id={player.id} key={player.id} onClick={() => onRemove(player.id)}>{actionLabel} {player.name}</button>) : <p className="hint">No players to remove.</p>}</div>;
}

function ReconnectPrompt({ onDecline, onRejoin, savedRoom }: { onDecline: () => void; onRejoin: () => void; savedRoom: OnlineClientState["savedRoom"] }) {
  return <div className="lobby lobby--reconnect"><h1 className="game-title"><a href="/">Reflex Royale</a></h1><p className="subtitle">Online Mode - Saved Room Found</p><div id="reconnectPromptDialog" className="lobby-form" role="dialog" aria-modal="true" aria-labelledby="reconnectPromptTitle"><h2 id="reconnectPromptTitle" className="round-control">Rejoin Room?</h2><p className="hint">Reconnect to room <strong>{savedRoom.roomCode}</strong> as <strong>{savedRoom.playerName}</strong>, or clear the saved room to join another lobby.</p><div className="game-over-actions"><button id="reconnectPromptYes" type="button" className="btn btn-primary" onClick={onRejoin}>Rejoin</button><button id="reconnectPromptNo" type="button" className="btn btn-secondary" onClick={onDecline}>Join Different Room</button></div></div></div>;
}

function PreferenceConflictDialog({ unavailable }: { unavailable: string[] }) {
  const [dismissedSignature, setDismissedSignature] = useState("");
  const signature = unavailable.join(",");
  if (!unavailable.length || dismissedSignature === signature) return null;
  const names = unavailable.map((item) => item === "theme" ? "Chroma Sigil" : "preferred key");
  const message = names.length === 2 ? "Your saved Chroma Sigil and preferred key are already claimed in this room. Pick open replacements before readying up." : `Your saved ${names[0] || "preference"} is already claimed in this room. Pick an open replacement before readying up.`;
  return (
    <div id="preferenceConflictDialog" className="preference-conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="preferenceConflictTitle">
      <div className="preference-conflict-dialog__panel">
        <h2 id="preferenceConflictTitle">Preference Collision</h2>
        <p>{message}</p>
        <button id="preferenceConflictClose" type="button" className="btn btn-primary" onClick={() => { setDismissedSignature(signature); window.setTimeout(() => document.getElementById(unavailable.includes("theme") ? "themePickerButton" : "keyInput")?.focus(), 0); }}>Choose Manually</button>
      </div>
    </div>
  );
}

function JoinScreen({ activeKey, claimedThemeCommands, errorMessage, onCreate, onJoin, onThemeSelect, selectedEntryRoundCount, selectedThemeCommand, setActiveKey, setSelectedEntryRoundCount, themePalette }: { activeKey: string; claimedThemeCommands: Set<string>; errorMessage: string | null; onCreate: (name: string, totalRounds: number) => void; onJoin: (name: string, room: string) => void; onThemeSelect: (protocol: ThemeProtocol) => void; selectedEntryRoundCount: number; selectedThemeCommand: string; setActiveKey: (key: string) => void; setSelectedEntryRoundCount: (value: number) => void; themePalette: ThemeProtocol[] }) {
  const [mode, setMode] = useState<"create" | "join">("join");
  const [room, setRoom] = useState("");
  const [name, setName] = useState(() => typeof window === "undefined" ? "" : window.localStorage.getItem(ONLINE_STORAGE_KEYS.playerName) || "");
  const isCreateMode = mode === "create";
  const appendEntryKey = (key: GameKey) => {
    const target = document.activeElement instanceof HTMLInputElement ? document.activeElement : null;
    const active = target?.id === "playerName" || target?.id === "roomCode" ? target : null;
    if (!active) return;
    const maxLength = active.maxLength || 0;
    if (maxLength > 0 && active.value.length >= maxLength) return;
    if (active.id === "playerName") setName((value) => `${value}${key.toUpperCase()}`.slice(0, 12));
    if (active.id === "roomCode") setRoom((value) => `${value}${key.toUpperCase()}`.slice(0, 6));
    setActiveKey(key);
    active.focus();
  };
  const submit = () => {
    if (isCreateMode) onCreate(name.trim(), selectedEntryRoundCount);
    else onJoin(name.trim(), room.trim().toUpperCase());
  };
  return (
    <div className="lobby">
      <h1 className="game-title"><a href="/">Reflex Royale</a></h1>
      <p className="subtitle">Online Mode - Join a Room</p>
      <div className="room-entry-tabs" role="tablist" aria-label="Room entry mode"><button id="createTabBtn" type="button" className={`room-entry-tab ${isCreateMode ? "room-entry-tab--active" : ""}`} role="tab" aria-selected={isCreateMode} onClick={() => setMode("create")}>Create</button><button id="joinTabBtn" type="button" className={`room-entry-tab ${!isCreateMode ? "room-entry-tab--active" : ""}`} role="tab" aria-selected={!isCreateMode} onClick={() => setMode("join")}>Join</button></div>
      <div className="lobby-form">
        <div className="online-entry-grid"><div className={`input-row input-row--online-entry ${isCreateMode ? "input-row--create-room" : ""}`}>{isCreateMode ? null : <input id="roomCode" type="text" placeholder="Room code" maxLength={6} autoComplete="off" value={room} onChange={(event) => { setRoom(event.target.value.toUpperCase()); setActiveKey(normalizeGameKey(event.target.value.slice(-1))); }} onKeyDown={(event) => { if (event.key === "Enter") submit(); else setActiveKey(normalizeGameKey(event.key)); }} />}<input id="playerName" type="text" placeholder="Your name" maxLength={12} autoComplete="off" value={name} onChange={(event) => { setName(event.target.value); setActiveKey(normalizeGameKey(event.target.value.slice(-1))); }} onKeyDown={(event) => { if (event.key === "Enter") submit(); else setActiveKey(normalizeGameKey(event.key)); }} /><button id={isCreateMode ? "createRoomBtn" : "joinBtn"} className="btn btn-primary" type="button" onClick={submit}>{isCreateMode ? "Create Room" : "Join"}</button></div></div>
        <ThemePicker claimedThemeCommands={claimedThemeCommands} selectedThemeCommand={selectedThemeCommand} themePalette={themePalette} onSelect={onThemeSelect} />
        {isCreateMode ? <RoundSlider id="roundCountInput" label="Round count" className="round-slider--create" value={selectedEntryRoundCount} onChange={setSelectedEntryRoundCount} /> : null}
        <p className="hint">{isCreateMode ? "Create a room, claim a Chroma Sigil, then share the generated room code with friends." : "Enter a room code, claim a Chroma Sigil, then join on your own device."}</p>
        {errorMessage ? <p className="hint">{errorMessage}</p> : null}
      </div>
      <div id="holoKeyboardMount"><HolographicKeyboard activeKey={activeKey} players={[]} title="ROOM ENTRY MATRIX" onEntryKey={appendEntryKey} /></div>
    </div>
  );
}

function OnlineLobby({ activeKey, isHost, myPlayerId, onBindKey, onCloseRoom, onRemove, onRoundCount, onSendChat, onStart, onThemeSelect, onToggleReady, roomState, selectedKey, selectedThemeCommand, setActiveKey, themePalette }: { activeKey: string; isHost: boolean; myPlayerId: string | null; onBindKey: (key: GameKey) => void; onCloseRoom: () => void; onRemove: (playerId: string) => void; onRoundCount: (totalRounds: number) => void; onSendChat: (content: string) => void; onStart: () => void; onThemeSelect: (protocol: ThemeProtocol) => void; onToggleReady: () => void; roomState: OnlineRoomState; selectedKey: string | null; selectedThemeCommand: string; setActiveKey: (key: string) => void; themePalette: ThemeProtocol[] }) {
  const [keyValue, setKeyValue] = useState(selectedKey?.toUpperCase() || "");
  const [hostRounds, setHostRounds] = useState(roomState.totalRounds);
  const currentPlayer = roomState.players.find((player) => player.id === myPlayerId);
  const claimedThemeCommands = useMemo(() => new Set(roomState.players.map((player) => player.themeCommand).filter(Boolean) as string[]), [roomState.players]);
  const selectedTheme = themePalette.find((protocol) => protocol.id === (currentPlayer?.themeCommand || selectedThemeCommand)) || themePalette[0] || null;
  const readyText = `${roomState.readyCount}/${Math.max(roomState.playerCount, 2)} ready`;
  const waitingText = roomState.waitingFor?.length ? `Waiting for: ${roomState.waitingFor.join(", ")}` : "Everyone is back in the lobby.";
  const canToggleReady = Boolean(currentPlayer?.hasKeyBinding);
  useEffect(() => setKeyValue(selectedKey?.toUpperCase() || currentPlayer?.keyBinding?.toUpperCase() || ""), [currentPlayer?.keyBinding, selectedKey]);
  useEffect(() => setHostRounds(roomState.totalRounds), [roomState.totalRounds]);
  const bindCurrentKey = () => {
    const key = normalizeGameKey(keyValue.trim());
    if (!key) return;
    onBindKey(key);
  };
  return (
    <div className="lobby lobby--online-room">
      <div className="lobby-layout-top"><h1 className="game-title"><a href="/">Reflex Royale</a></h1><p className="subtitle">Room {roomState.room}</p><p id="roomHint" className="hint">{readyText} - Rounds: {roomState.totalRounds}</p><p id="waitingHint" className="hint">{waitingText}</p></div>
      <div className="lobby-player-grid"><Roster isHost={isHost} myPlayerId={myPlayerId} onRemove={onRemove} players={roomState.players} roomState={roomState} themePalette={themePalette} /><div className="lobby-control-stack"><div className="lobby-form"><div className="input-row input-row--online-key-card"><input id="keyInput" type="text" placeholder="Pick your key" maxLength={1} autoComplete="off" value={keyValue} onChange={(event) => { const key = normalizeGameKey(event.target.value); setKeyValue(key.toUpperCase()); setActiveKey(key); }} onKeyDown={(event) => { event.preventDefault(); const key = normalizeGameKey(event.key); setKeyValue(key.toUpperCase()); setActiveKey(key); }} /><button id="bindKeyBtn" className="btn btn-secondary" type="button" onClick={bindCurrentKey}>Set Key</button><button id="readyBtn" className="btn btn-primary" type="button" disabled={!canToggleReady} onClick={onToggleReady}>{currentPlayer?.isReady ? "Unready" : canToggleReady ? "Ready Up" : "Set Key First"}</button></div><ThemePicker claimedThemeCommands={claimedThemeCommands} currentPlayerThemeCommand={currentPlayer?.themeCommand} selectedThemeCommand={selectedThemeCommand} themePalette={themePalette} onSelect={onThemeSelect} /><p className="hint">Click a holographic key or press a character key, claim a Chroma Sigil, then set it. Press your assigned key to toggle ready.</p></div></div></div>
      {isHost ? <aside className="online-host-terminal" aria-label="Host terminal"><section className="online-host-controls" aria-label="Host controls"><div className="host-control host-control--rounds"><RoundSlider id="hostRoundCountInput" label="Round count" className="round-slider--host" value={hostRounds} onChange={setHostRounds} /></div><button id="applyRoundCountBtn" className="btn btn-secondary" type="button" onClick={() => onRoundCount(hostRounds)}>Update Rounds</button><button id="closeRoomBtn" className="btn btn-secondary" type="button" onClick={onCloseRoom}>Close Room</button></section><button id="startGameBtn" className="btn btn-primary btn-go" type="button" disabled={!roomState.canStart} onClick={onStart}>Start Game</button></aside> : null}
      <div id="holoKeyboardMount" style={{ "--keyboard-accent": selectedTheme?.color || "var(--primary, #68e8ff)" } as React.CSSProperties}><HolographicKeyboard activeKey={activeKey} currentPlayerId={myPlayerId} draggable players={roomState.players} title="Room Buzzer Matrix" onKeyClick={(key) => { setKeyValue(key.toUpperCase()); setActiveKey(key); }} onDropPlayerKey={(key) => { setKeyValue(key.toUpperCase()); setActiveKey(key); onBindKey(key); }} /></div>
      <ChatPanel messages={roomState.chatMessages || []} onSend={onSendChat} players={roomState.players} />
    </div>
  );
}

function MatchHostControls(props: { isHost: boolean; myPlayerId: string | null; onRemove: (playerId: string) => void; players: OnlinePlayer[] }) {
  if (!props.isHost || !props.players.length) return null;
  return <aside className="online-host-controls online-match-host-controls" aria-label="Host controls"><HostRosterControls actionLabel="Kick" {...props} /></aside>;
}

function MatchScreen({ feedback, isHost, message, myPlayerId, onPlayerInput, onRemove, onSendChat, roomState, signal }: { feedback: React.ReactNode; isHost: boolean; message: string; myPlayerId: string | null; onPlayerInput: () => void; onRemove: (playerId: string) => void; onSendChat: (content: string) => void; roomState: OnlineRoomState | null; signal: "countdown" | "waiting" | "react" }) {
  const isGreen = signal === "react";
  const isRed = signal === "waiting";
  const arenaClass = isGreen ? "arena-solo arena-solo--react" : isRed ? "arena-solo arena-solo--waiting" : "arena-solo arena-solo--countdown";
  const lightClass = isGreen ? "green" : isRed ? "red" : "off";
  return <div className="online-state online-state--match" onTouchStart={(event) => { if (!isTypingTarget(event.target)) onPlayerInput(); }}><div className="online-state__center"><div className={arenaClass}><div className="player-panel-solo" data-signal={signal === "countdown" ? message : undefined}><div className="panel-light"><div className={`light-circle ${lightClass}`} /></div></div><div className="solo-feedback">{feedback}</div></div></div><MatchHostControls isHost={isHost} myPlayerId={myPlayerId} onRemove={onRemove} players={roomState?.players || []} />{roomState ? <ChatPanel messages={roomState.chatMessages || []} onSend={onSendChat} players={roomState.players} /> : null}</div>;
}

function RoundEndScreen({ isHost, myPlayerId, onNextRound, onRemove, onSendChat, roomState, roundEnd }: { isHost: boolean; myPlayerId: string | null; onNextRound: () => void; onRemove: (playerId: string) => void; onSendChat: (content: string) => void; roomState: OnlineRoomState | null; roundEnd: OnlineRoundSummary }) {
  return <div className="online-state online-state--round-end"><div className="online-state__center"><div className="round-results"><h2>Round {roundEnd.roundNum} Results</h2><ol className="results-list">{roundEnd.results.map((result, index) => <li className={`${index === 0 && result.outcome === "valid" ? "winner" : ""}${result.id === myPlayerId ? " you" : ""}`} key={result.id}><span className="result-name">{result.name}</span><span className="result-time">{formatResult(result)}</span><span className="result-points">{result.points ? `+${result.points}` : "-"}</span></li>)}</ol><div className="game-over-actions">{isHost ? <button id="nextRoundBtn" className="btn btn-primary btn-big" type="button" onClick={onNextRound}>Next Round</button> : <p className="hint">Waiting for host...</p>}</div></div></div><MatchHostControls isHost={isHost} myPlayerId={myPlayerId} onRemove={onRemove} players={roomState?.players || []} />{roomState ? <ChatPanel messages={roomState.chatMessages || []} onSend={onSendChat} players={roomState.players} /> : null}</div>;
}

function StandingsTable({ myPlayerId, standings }: { myPlayerId: string | null; standings: OnlineStanding[] }) {
  return <table className="standings-table"><thead><tr><th>#</th><th>Player</th><th>Score</th><th>Wins</th><th>Best</th><th>Avg</th><th>False Starts</th></tr></thead><tbody>{standings.map((standing, index) => <tr style={{ color: standing.color }} className={`${index === 0 ? "first-place" : ""}${standing.id === myPlayerId ? " you-row" : ""}`} key={standing.id}><td>{index + 1}</td><td>{standing.name}</td><td>{standing.totalScore}</td><td>{standing.wins}</td><td>{standing.bestTime !== null ? `${standing.bestTime} ms` : "-"}</td><td>{standing.avgTime !== null ? `${standing.avgTime} ms` : "-"}</td><td>{standing.falseStarts}</td></tr>)}</tbody></table>;
}

function PostMatchScreen({ isHost, myPlayerId, onLeave, onRemove, onReturnLobby, onSendChat, roomState, themePalette }: { isHost: boolean; myPlayerId: string | null; onLeave: () => void; onRemove: (playerId: string) => void; onReturnLobby: () => void; onSendChat: (content: string) => void; roomState: OnlineRoomState; themePalette: ThemeProtocol[] }) {
  const currentPlayer = roomState.players.find((player) => player.id === myPlayerId);
  const waitingText = roomState.waitingFor?.length ? `Waiting for: ${roomState.waitingFor.join(", ")}` : "Everyone is back in the lobby.";
  return <div className="online-state online-state--post-match"><div className="online-state__center"><div className="game-over"><h1 className="winner-banner">Room {roomState.room}</h1><p className="hint">{waitingText}</p><p className="hint">Rounds: {roomState.totalRounds}</p><div className="game-over-actions"><button id="returnLobbyBtn" className="btn btn-primary btn-big" type="button" onClick={onReturnLobby}>{currentPlayer?.isInLobbyView ? "Back in Lobby" : "Return to Lobby"}</button><button id="leaveRoomBtn" className="btn btn-secondary" type="button" onClick={onLeave}>Leave Room</button></div><HostRosterControls isHost={isHost} myPlayerId={myPlayerId} onRemove={onRemove} players={roomState.players} /><Roster isHost={isHost} myPlayerId={myPlayerId} onRemove={onRemove} players={roomState.players} roomState={roomState} themePalette={themePalette} /><StandingsTable myPlayerId={myPlayerId} standings={roomState.standings || []} /></div></div><ChatPanel messages={roomState.chatMessages || []} onSend={onSendChat} players={roomState.players} /></div>;
}

function GameOverScreen({ isHost, myPlayerId, onPlayAgain, onRemove, onReturnLobby, onSendChat, roomState, standings }: { isHost: boolean; myPlayerId: string | null; onPlayAgain: () => void; onRemove: (playerId: string) => void; onReturnLobby: () => void; onSendChat: (content: string) => void; roomState: OnlineRoomState | null; standings: OnlineStanding[] }) {
  return <div className="online-state online-state--game-over"><div className="online-state__center"><div className="game-over"><h1 className="winner-banner">{standings[0]?.name || "Player"} Wins!</h1><StandingsTable myPlayerId={myPlayerId} standings={standings} /><div className="game-over-actions"><button id="returnLobbyBtn" className="btn btn-primary btn-big" type="button" onClick={onReturnLobby}>Return to Lobby</button>{isHost ? <button id="playAgainBtn" className="btn btn-secondary" type="button" onClick={onPlayAgain}>Play Again</button> : null}</div></div></div><MatchHostControls isHost={isHost} myPlayerId={myPlayerId} onRemove={onRemove} players={roomState?.players || []} />{roomState ? <ChatPanel messages={roomState.chatMessages || []} onSend={onSendChat} players={roomState.players} /> : null}</div>;
}

function reduceAndPersist(state: OnlineClientState, action: Parameters<typeof onlineClientReducer>[1]) {
  const next = onlineClientReducer(state, action);
  if (["roomCreated", "roomJoined"].includes(action.type)) persistJoinedRoom(next);
  if (["savedRoomDeclined", "removedFromLobby", "roomClosed"].includes(action.type)) persistClearedRoom(next);
  return next;
}

export function OnlineGameRuntime({ localPlayerThemeShades = null }: OnlineGameRuntimeProps) {
  const [socketReady, setSocketReady] = useState(false);
  const [state, dispatch] = useReducer(reduceAndPersist, null, () => createInitialOnlineClientState(typeof window === "undefined" ? {} : readStorage()));
  const [selectedEntryRoundCount, setSelectedEntryRoundCount] = useState(5);
  const [selectedThemeCommand, setSelectedThemeCommand] = useState("tron");
  const [activeKey, setActiveKey] = useState("");
  const [reactionFeedback, setReactionFeedback] = useState<React.ReactNode>(null);
  const [transition, setTransition] = useState<TransitionState | null>(null);
  const socketRef = useRef<SocketLike | null>(null);
  const stateRef = useRef(state);
  const activeKeyTimeout = useRef<number | null>(null);
  const matchStartedAt = useRef(0);
  const matchRecorded = useRef(false);
  const themePalette = useMemo(() => getThemePalette(localPlayerThemeShades), [localPlayerThemeShades]);

  const pulseKey = useCallback((key: string) => {
    setActiveKey(key);
    if (activeKeyTimeout.current) window.clearTimeout(activeKeyTimeout.current);
    activeKeyTimeout.current = window.setTimeout(() => setActiveKey(""), 420);
  }, []);

  const selectedTheme = themePalette.find((protocol) => protocol.id === selectedThemeCommand) || themePalette[0] || null;
  const preferredOptions = useCallback(() => ({ preferredKey: normalizeGameKey(window.localStorage.getItem(ONLINE_STORAGE_KEYS.preferredKey) || ""), preferredThemeCommand: selectedTheme?.id || "tron", preferredThemeColor: selectedTheme?.color || "#00d4ff" }), [selectedTheme]);
  const emit = useCallback((event: string, payload?: any) => socketRef.current?.emit(event, payload), []);

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => setSelectedThemeCommand(readCurrentThemeCommand()), []);

  useEffect(() => {
    delete document.documentElement.dataset.pageReady;
    const first = window.requestAnimationFrame(() => window.requestAnimationFrame(() => { document.documentElement.dataset.pageReady = "true"; window.__reflexRoyaleGameReady = true; window.dispatchEvent(new Event("reflex-royale-game-ready")); }));
    return () => window.cancelAnimationFrame(first);
  }, []);

  useEffect(() => { announceMatchState(state.matchInProgress); }, [state.matchInProgress]);

  useEffect(() => {
    if (!socketReady || socketRef.current || !window.io) return;
    const socket = window.io();
    socketRef.current = socket;

    socket.on("roomCreated", (payload: OnlineServerToClientEvents["roomCreated"]) => dispatch({ type: "roomCreated", payload }));
    socket.on("roomJoined", (payload: OnlineServerToClientEvents["roomJoined"]) => dispatch({ type: "roomJoined", payload }));
    socket.on("savedRoomChecked", (payload: OnlineServerToClientEvents["savedRoomChecked"]) => dispatch({ type: "savedRoomChecked", payload }));
    socket.on("roomState", (payload: OnlineServerToClientEvents["roomState"]) => dispatch({ type: "roomState", payload }));
    socket.on("keyBound", (payload: OnlineServerToClientEvents["keyBound"]) => dispatch({ type: "keyBound", payload }));
    socket.on("themeBound", (payload: OnlineServerToClientEvents["themeBound"]) => dispatch({ type: "themeBound", payload }));
    socket.on("preferenceConflict", (payload: OnlineServerToClientEvents["preferenceConflict"]) => dispatch({ type: "preferenceConflict", payload }));
    socket.on("matchStarting", (payload: OnlineServerToClientEvents["matchStarting"]) => {
      dispatch({ type: "matchStarting", payload });
      if (!matchStartedAt.current) { matchStartedAt.current = Date.now(); matchRecorded.current = false; }
      const currentState = stateRef.current;
      const players = (payload.players || currentState.roomState?.players || []).map((player) => {
        const theme = themePalette.find((protocol) => protocol.id === player.themeCommand);
        return { id: player.id, name: player.name, color: player.color, themeCommand: player.themeCommand, themeLabel: theme?.label || player.themeCommand || "Custom", key: "key" in player ? player.key : (player as OnlinePlayer).keyBinding } satisfies LocalTransitionPlayer;
      });
      const duration = payload.duration || MATCH_TRANSITION_DURATION_MS;
      const splashDuration = payload.splashDuration || MATCH_PLAYER_SPLASH_DURATION_MS;
      flushSync(() => setTransition({ duration, splashDuration, players, phase: "tunnel" }));
      window.setTimeout(() => setTransition({ duration, splashDuration, players, phase: "splash" }), duration);
      window.setTimeout(() => setTransition(null), duration + splashDuration);
    });
    socket.on("playerList", (payload: OnlineServerToClientEvents["playerList"]) => {
      const currentState = stateRef.current;
      if (!currentState.roomState) return;
      dispatch({ type: "roomState", payload: { ...currentState.roomState, players: payload.players } });
    });
    socket.on("chatMessage", (payload: OnlineServerToClientEvents["chatMessage"]) => {
      const currentState = stateRef.current;
      if (!currentState.roomState) return;
      dispatch({ type: "roomState", payload: { ...currentState.roomState, chatMessages: payload.messages || [] } });
    });
    socket.on("lobbyStatus", (payload: OnlineServerToClientEvents["lobbyStatus"]) => {
      const currentState = stateRef.current;
      if (!currentState.roomState) return;
      dispatch({ type: "roomState", payload: { ...currentState.roomState, waitingFor: payload.waitingFor || [] } });
    });
    socket.on("removedFromLobby", (payload: OnlineServerToClientEvents["removedFromLobby"]) => dispatch({ type: "removedFromLobby", payload }));
    socket.on("countdown", (payload: OnlineServerToClientEvents["countdown"]) => { setReactionFeedback(null); if (!matchStartedAt.current) { matchStartedAt.current = Date.now(); matchRecorded.current = false; } dispatch({ type: "countdown", payload }); });
    socket.on("waiting", (payload: OnlineServerToClientEvents["waiting"]) => { setReactionFeedback(null); dispatch({ type: "waiting", payload }); });
    socket.on("react", (payload: OnlineServerToClientEvents["react"]) => { setReactionFeedback(null); dispatch({ type: "react", payload }); });
    socket.on("falseStart", (payload: OnlineServerToClientEvents["falseStart"]) => { if (payload.id === stateRef.current.myPlayerId) setReactionFeedback(<span className="false-start">Too early!</span>); });
    socket.on("playerReacted", (payload: OnlineServerToClientEvents["playerReacted"]) => { if (payload.id === stateRef.current.myPlayerId) setReactionFeedback(<span className="reaction-time">{payload.time} ms</span>); });
    socket.on("roundEnd", (payload: OnlineServerToClientEvents["roundEnd"]) => dispatch({ type: "roundEnd", payload }));
    socket.on("gameOver", (payload: OnlineServerToClientEvents["gameOver"]) => { dispatch({ type: "gameOver", payload }); if (!matchRecorded.current) { matchRecorded.current = true; void recordOnlineRecentMatch(payload.standings || [], stateRef.current.myPlayerId, matchStartedAt.current); matchStartedAt.current = 0; } });
    socket.on("roomClosed", (payload: OnlineServerToClientEvents["roomClosed"]) => dispatch({ type: "roomClosed", payload }));
    socket.on("disconnect", () => {
      setTransition(null);
      setReactionFeedback(null);
      matchStartedAt.current = 0;
      dispatch({ type: "socketDisconnected", payload: { message: "Connection lost. Reconnect to your saved room?" } });
    });
    socket.on("connect_error", () => {
      setTransition(null);
      setReactionFeedback(null);
      dispatch({ type: "socketDisconnected", payload: { message: "Connection lost. Reconnect to your saved room?" } });
    });
    socket.on("error", (payload: OnlineServerToClientEvents["error"]) => dispatch({ type: "error", payload }));

    const currentState = stateRef.current;
    if (currentState.view === "checking_saved_room") {
      dispatch({ type: "savedRoomCheckStarted" });
      socket.emit("checkSavedRoom", { name: currentState.savedRoom.playerName, room: currentState.savedRoom.roomCode, verifier: currentState.verifier });
    }

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [socketReady, themePalette]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.key === "Enter") {
        const chatInput = document.getElementById("chatInput");
        if (chatInput instanceof HTMLInputElement) { event.preventDefault(); chatInput.focus(); return; }
      }
      const key = normalizeGameKey(event.key);
      if (!key) return;
      pulseKey(key);
      if (state.roomState && (state.roomState.status === "waiting_for_players" || state.roomState.status === "ready_check") && state.selectedKey === key) { event.preventDefault(); emit("toggleReady"); return; }
      if (!state.roomState || !["countdown", "waiting", "react"].includes(state.roomState.status)) return;
      if (state.selectedKey === key) { event.preventDefault(); emit("playerInput"); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [emit, pulseKey, state.roomState, state.selectedKey]);

  useEffect(() => () => { if (activeKeyTimeout.current) window.clearTimeout(activeKeyTimeout.current); announceMatchState(false); }, []);

  const bindTheme = (protocol: ThemeProtocol) => { setSelectedThemeCommand(protocol.id); emit("bindTheme", { themeCommand: protocol.id, color: protocol.color }); };
  const createRoom = (name: string, totalRounds: number) => { if (!name) return dispatch({ type: "error", payload: { message: "Enter your name first." } }); window.localStorage.setItem(ONLINE_STORAGE_KEYS.playerName, name); emit("createRoom", { name, verifier: state.verifier, totalRounds, ...preferredOptions() }); };
  const joinRoom = (name: string, room: string) => { if (!name || !room) return dispatch({ type: "error", payload: { message: "Enter both name and room code." } }); window.localStorage.setItem(ONLINE_STORAGE_KEYS.playerName, name); window.localStorage.setItem(ONLINE_STORAGE_KEYS.roomCode, room); dispatch({ type: "manualJoinRequested", name, room }); emit("joinRoom", { name, room, verifier: state.verifier, hostReclaimToken: state.savedRoom.hostReclaimToken, ...preferredOptions() }); };
  const joinSavedRoom = () => { dispatch({ type: "joinSavedRoomRequested" }); emit("joinRoom", { name: state.savedRoom.playerName, room: state.savedRoom.roomCode, verifier: state.verifier, hostReclaimToken: state.savedRoom.hostReclaimToken, ...preferredOptions() }); };
  const declineSavedRoom = () => dispatch({ type: "savedRoomDeclined" });

  const claimedThemeCommands = useMemo(() => new Set((state.roomState?.players || []).map((player) => player.themeCommand).filter(Boolean) as string[]), [state.roomState?.players]);

  let content: React.ReactNode;
  if (state.view === "checking_saved_room") {
    content = <div className="lobby lobby--reconnect"><h1 className="game-title"><a href="/">Reflex Royale</a></h1><p className="subtitle">Online Mode - Checking Saved Room</p><div className="lobby-form"><p className="hint">Checking whether room <strong>{state.savedRoom.roomCode}</strong> is still available...</p></div></div>;
  } else if (state.view === "reconnect_prompt") {
    content = <ReconnectPrompt savedRoom={state.savedRoom} onRejoin={joinSavedRoom} onDecline={declineSavedRoom} />;
  } else if (state.view === "lobby" && state.roomState) {
    content = <OnlineLobby activeKey={activeKey} isHost={state.isHost} myPlayerId={state.myPlayerId} onBindKey={(key) => emit("bindKey", { key })} onCloseRoom={() => emit("closeRoom")} onRemove={(playerId) => emit("removePlayer", { playerId })} onRoundCount={(totalRounds) => totalRounds >= 1 && totalRounds <= 20 ? emit("setRoundCount", { totalRounds }) : dispatch({ type: "error", payload: { message: "Round count must be between 1 and 20." } })} onSendChat={(content) => emit("sendChatMessage", { content })} onStart={() => emit("startGame")} onThemeSelect={bindTheme} onToggleReady={() => emit("toggleReady")} roomState={state.roomState} selectedKey={state.selectedKey} selectedThemeCommand={selectedThemeCommand} setActiveKey={pulseKey} themePalette={themePalette} />;
  } else if (state.view === "post_match" && state.roomState) {
    content = <PostMatchScreen isHost={state.isHost} myPlayerId={state.myPlayerId} onLeave={() => emit("leaveRoom")} onRemove={(playerId) => emit("removePlayer", { playerId })} onReturnLobby={() => emit("requestLobbyView")} onSendChat={(content) => emit("sendChatMessage", { content })} roomState={state.roomState} themePalette={themePalette} />;
  } else if (state.view === "round_end" && state.lastRoundEnd) {
    content = <RoundEndScreen isHost={state.isHost} myPlayerId={state.myPlayerId} onNextRound={() => emit("nextRound")} onRemove={(playerId) => emit("removePlayer", { playerId })} onSendChat={(content) => emit("sendChatMessage", { content })} roomState={state.roomState} roundEnd={state.lastRoundEnd} />;
  } else if (state.view === "game_over") {
    content = <GameOverScreen isHost={state.isHost} myPlayerId={state.myPlayerId} onPlayAgain={() => emit("playAgain")} onRemove={(playerId) => emit("removePlayer", { playerId })} onReturnLobby={() => emit("requestLobbyView")} onSendChat={(content) => emit("sendChatMessage", { content })} roomState={state.roomState} standings={state.standings} />;
  } else if (state.view === "match") {
    const signal = state.matchPhase === "react" ? "react" : state.matchPhase === "waiting" ? "waiting" : "countdown";
    const message = signal === "react" ? "GO!" : signal === "waiting" ? "Wait for it..." : String(state.countdownRemaining ?? "");
    content = <MatchScreen feedback={reactionFeedback} isHost={state.isHost} message={message} myPlayerId={state.myPlayerId} onPlayerInput={() => emit("playerInput")} onRemove={(playerId) => emit("removePlayer", { playerId })} onSendChat={(content) => emit("sendChatMessage", { content })} roomState={state.roomState} signal={signal} />;
  } else {
    content = <JoinScreen activeKey={activeKey} claimedThemeCommands={claimedThemeCommands} errorMessage={state.errorMessage} onCreate={createRoom} onJoin={joinRoom} onThemeSelect={(protocol) => setSelectedThemeCommand(protocol.id)} selectedEntryRoundCount={selectedEntryRoundCount} selectedThemeCommand={selectedThemeCommand} setActiveKey={pulseKey} setSelectedEntryRoundCount={setSelectedEntryRoundCount} themePalette={themePalette} />;
  }

  return (
    <>
      <link rel="stylesheet" href="/game.css" />
      <div data-wait-for-game-ready="true" className="flex min-h-0 w-full flex-1">
        <div id="game-root" suppressHydrationWarning>
          {content}
          {state.notification ? <p className="hint online-runtime-notification" role="alert">{state.notification.message}</p> : null}
        </div>
        <PreferenceConflictDialog unavailable={state.preferenceConflict} />
        {transition?.phase === "tunnel" ? <LocalGameTransition className="local-game-transition-overlay" durationMs={transition.duration} /> : null}
        {transition?.phase === "splash" ? <LocalPlayerSplash className="local-player-splash-overlay" players={transition.players} durationMs={transition.splashDuration} /> : null}
      </div>
      <Script src="/socket.io/socket.io.js" strategy="afterInteractive" onLoad={() => setSocketReady(true)} />
    </>
  );
}
